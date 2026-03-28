"""
Azure Conversation Transcription with Diarization
===================================================
Primary diarization engine using Azure AI Speech SDK's
ConversationTranscriber API for multi-speaker recognition.

Features:
  - Real-time streaming diarization
  - Automatic speaker labeling (Guest-1, Guest-2, ...)
  - Multi-language support (en-IN, hi-IN, kn-IN, bn-IN)
  - Integrated with Azure's neural voice models
"""

import os
import logging
import numpy as np
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("diarization.azure")

# Lazy import — only loaded if Azure credentials are available
azure_speech_sdk = None


def _ensure_sdk():
    """Lazy-load Azure Speech SDK."""
    global azure_speech_sdk
    if azure_speech_sdk is None:
        try:
            import azure.cognitiveservices.speech as sdk
            azure_speech_sdk = sdk
            logger.info("[Azure] Speech SDK loaded successfully")
        except ImportError:
            raise RuntimeError(
                "Azure Speech SDK not installed. "
                "Run: pip install azure-cognitiveservices-speech"
            )


class AzureDiarizer:
    """
    Azure Conversation Transcription with built-in speaker diarization.

    Uses Azure's ConversationTranscriber which provides:
    - Automatic speaker identification
    - Real-time streaming support
    - High-accuracy multi-speaker transcription
    """

    def __init__(self):
        _ensure_sdk()
        self.speech_key = os.getenv("AZURE_SPEECH_KEY", "").strip()
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "centralindia").strip()

        if not self.speech_key:
            raise ValueError(
                "AZURE_SPEECH_KEY not set. "
                "Set it in ai-core/diarization/.env or environment."
            )

        logger.info(f"[Azure] Diarizer initialized (region={self.speech_region})")

    def transcribe_with_diarization(
        self,
        audio: np.ndarray,
        sr: int = 16000,
        language: str = "en-IN",
    ) -> list[dict]:
        """
        Transcribe audio with speaker diarization using Azure ConversationTranscriber.

        Args:
            audio: np.ndarray float32 PCM, shape (num_samples,)
            sr: sample rate (16kHz expected)
            language: recognition language

        Returns:
            List of dicts:
            [
                {
                    "speaker_id": "Guest-1",
                    "text": "Hello, do you have Maggi?",
                    "offset_ms": 1200,
                    "duration_ms": 3400,
                }
            ]
        """
        sdk = azure_speech_sdk

        # ── Speech Config ────────────────────────────────────────────────────
        speech_config = sdk.SpeechConfig(
            subscription=self.speech_key,
            region=self.speech_region,
        )
        speech_config.speech_recognition_language = language

        # Enable diarization-specific settings
        speech_config.set_property(
            sdk.PropertyId.SpeechServiceConnection_LanguageIdMode,
            "Continuous"
        )

        # ── Audio Stream ─────────────────────────────────────────────────────
        # Convert float32 to int16 PCM for Azure
        audio_int16 = (audio * 32767).astype(np.int16)
        audio_bytes = audio_int16.tobytes()

        audio_format = sdk.audio.AudioStreamFormat(
            samples_per_second=sr,
            bits_per_sample=16,
            channels=1,
        )
        push_stream = sdk.audio.PushAudioInputStream(audio_format)
        push_stream.write(audio_bytes)
        push_stream.close()

        audio_config = sdk.audio.AudioConfig(stream=push_stream)

        # ── Conversation Transcriber ─────────────────────────────────────────
        transcriber = sdk.ConversationTranscriber(speech_config, audio_config)

        results = []
        done = False

        def handle_transcribed(evt):
            """Callback: final transcription result with speaker ID."""
            if evt.result.reason == sdk.ResultReason.RecognizedSpeech:
                result = {
                    "speaker_id": evt.result.speaker_id or "Unknown",
                    "text": evt.result.text,
                    "offset_ms": evt.result.offset / 10000,  # Ticks to ms
                    "duration_ms": evt.result.duration / 10000,
                }
                results.append(result)
                logger.debug(
                    f"[Azure] {result['speaker_id']}: \"{result['text']}\" "
                    f"({result['offset_ms']:.0f}ms)"
                )

        def handle_canceled(evt):
            """Callback: cancellation (error or end of audio)."""
            nonlocal done
            if evt.reason == sdk.CancellationReason.Error:
                logger.error(
                    f"[Azure] Transcription error: {evt.error_details}"
                )
            done = True

        def handle_stopped(evt):
            """Callback: session ended."""
            nonlocal done
            done = True

        # Wire up events
        transcriber.transcribed.connect(handle_transcribed)
        transcriber.canceled.connect(handle_canceled)
        transcriber.session_stopped.connect(handle_stopped)

        # Start transcription
        transcriber.start_transcribing_async().get()

        # Wait for completion
        import time
        timeout = max(5, len(audio) / sr + 5)  # audio duration + 5s buffer
        start_time = time.time()
        while not done and (time.time() - start_time) < timeout:
            time.sleep(0.1)

        transcriber.stop_transcribing_async().get()

        logger.info(f"[Azure] Diarization complete: {len(results)} segment(s)")
        return results

    def is_available(self) -> bool:
        """Check if Azure credentials are configured."""
        return bool(self.speech_key)


class AzureDiarizerFactory:
    """Factory with graceful fallback."""

    _instance = None

    @classmethod
    def get(cls) -> AzureDiarizer | None:
        """Get Azure diarizer, or None if not configured."""
        if cls._instance is None:
            try:
                cls._instance = AzureDiarizer()
            except (ValueError, RuntimeError) as e:
                logger.warning(f"[Azure] Diarizer unavailable: {e}")
                return None
        return cls._instance
