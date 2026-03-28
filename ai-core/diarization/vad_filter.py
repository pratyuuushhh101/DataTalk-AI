"""
Voice Activity Detection & Noise Robustness Pipeline
=====================================================
Filters incoming audio to remove silence, noise, and sub-threshold segments
before they reach the diarization pipeline.

Uses:
  - Silero VAD (ONNX) for speech/non-speech classification
  - Band-pass filter for retail noise suppression
  - Energy thresholding to reject whisper-level artifacts
"""

import numpy as np
from scipy.signal import butter, sosfilt
import torch
import logging

logger = logging.getLogger("diarization.vad")

# ── Constants ────────────────────────────────────────────────────────────────
SAMPLE_RATE = 16000
MIN_SPEECH_DURATION_SEC = 0.8       # Reject segments shorter than 800ms
ENERGY_THRESHOLD_DB = -45.5         # RMS energy floor (Reduced by 30% to capture quieter speech)
BANDPASS_LOW_HZ = 300               # High-pass cutoff (cuts low-freq hum)
BANDPASS_HIGH_HZ = 3400             # Low-pass cutoff (cuts high-freq hiss)


class VADFilter:
    """
    Production-grade VAD pipeline combining Silero model + signal processing.
    Designed for CPU-only inference (< 1ms per chunk).
    """

    def __init__(self):
        # Load Silero VAD model (ONNX, CPU-only, ~1MB)
        self.model, self.utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            onnx=True,
            trust_repo=True,
        )
        (
            self.get_speech_timestamps,
            self.save_audio,
            self.read_audio,
            self.VADIterator,
            self.collect_chunks,
        ) = self.utils

        # Pre-compute bandpass filter coefficients
        self._sos = self._design_bandpass(BANDPASS_LOW_HZ, BANDPASS_HIGH_HZ, SAMPLE_RATE)
        logger.info("[VAD] Silero VAD loaded (ONNX mode)")

    # ── Public API ───────────────────────────────────────────────────────────

    def filter(self, audio: np.ndarray, sr: int = SAMPLE_RATE) -> list[dict]:
        """
        Full noise-robustness pipeline.

        Args:
            audio: Raw PCM float32 array, shape (num_samples,)
            sr: Sample rate (default 16kHz)

        Returns:
            List of dicts with keys: 'audio', 'start', 'end'
            Each is a clean speech segment ready for diarization.
        """
        if audio.size == 0:
            return []

        # Step 1: Band-pass filter (remove retail noise)
        filtered = self._apply_bandpass(audio)

        # Step 2: Silero VAD — get speech timestamps
        audio_tensor = torch.from_numpy(filtered).float()
        speech_timestamps = self.get_speech_timestamps(
            audio_tensor, self.model, sampling_rate=sr,
            threshold=0.5,                  # Speech probability threshold
            min_speech_duration_ms=300,     # Internal minimum
            min_silence_duration_ms=200,    # Allow brief pauses within speech
        )

        if not speech_timestamps:
            logger.debug("[VAD] No speech detected in chunk")
            return []

        # Step 3: Extract segments + validate
        segments = []
        for ts in speech_timestamps:
            start_sample = ts["start"]
            end_sample = ts["end"]
            segment_audio = filtered[start_sample:end_sample]

            duration_sec = len(segment_audio) / sr

            # Gate: minimum duration
            if duration_sec < MIN_SPEECH_DURATION_SEC:
                logger.debug(f"[VAD] Rejecting short segment ({duration_sec:.2f}s)")
                continue

            # Gate: energy threshold
            rms_db = self._compute_rms_db(segment_audio)
            if rms_db < ENERGY_THRESHOLD_DB:
                logger.debug(f"[VAD] Rejecting low-energy segment ({rms_db:.1f}dB)")
                continue

            segments.append({
                "audio": segment_audio,
                "start": start_sample / sr,
                "end": end_sample / sr,
                "duration": duration_sec,
                "rms_db": float(rms_db),
            })

        logger.info(f"[VAD] Extracted {len(segments)} valid speech segment(s)")
        return segments

    def reset(self):
        """Reset VAD model state (call between sessions)."""
        self.model.reset_states()
        logger.info("[VAD] Model state reset for new session")

    # ── Internal Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _design_bandpass(low_hz: int, high_hz: int, sr: int, order: int = 5):
        """Butterworth bandpass filter design."""
        nyquist = sr / 2
        low = low_hz / nyquist
        high = high_hz / nyquist
        return butter(order, [low, high], btype="band", output="sos")

    def _apply_bandpass(self, audio: np.ndarray) -> np.ndarray:
        """Apply the pre-computed bandpass filter."""
        return sosfilt(self._sos, audio).astype(np.float32)

    @staticmethod
    def _compute_rms_db(audio: np.ndarray) -> float:
        """Compute RMS energy in dB."""
        rms = np.sqrt(np.mean(audio ** 2))
        if rms == 0:
            return -100.0
        return 20 * np.log10(rms)
