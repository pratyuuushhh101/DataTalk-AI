"""
Audio Conversion Utility
========================
Converts any browser-recorded audio format (webm, ogg, mp4, etc.)
to a clean 16kHz mono WAV using ffmpeg subprocess.

This is REQUIRED because:
  - Browsers record in webm/opus format
  - SpeechBrain / torchaudio cannot decode webm natively
  - soundfile (libsndfile) also rejects webm
  - ffmpeg is the only reliable universal decoder
"""

import subprocess
import tempfile
import os
import logging

logger = logging.getLogger("audio_utils")


def convert_to_wav(input_bytes: bytes) -> bytes:
    """
    Convert arbitrary audio bytes to 16kHz mono WAV using ffmpeg.
    
    Args:
        input_bytes: Raw audio bytes (webm, ogg, mp4, wav, etc.)
    
    Returns:
        WAV bytes (16kHz, mono, PCM s16le)
    
    Raises:
        RuntimeError: If ffmpeg conversion fails
    """
    if not input_bytes or len(input_bytes) < 1024:
        raise RuntimeError(f"Audio too small ({len(input_bytes)} bytes), likely empty or corrupt")

    in_path = None
    out_path = None

    try:
        # Write input to temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as in_file:
            in_file.write(input_bytes)
            in_file.flush()
            in_path = in_file.name

        # Create output temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_file:
            out_path = out_file.name

        # Run ffmpeg conversion
        command = [
            "ffmpeg",
            "-y",                # Overwrite output
            "-i", in_path,       # Input file
            "-ac", "1",          # Mono
            "-ar", "16000",      # 16kHz sample rate
            "-sample_fmt", "s16", # 16-bit PCM
            "-f", "wav",         # WAV format
            out_path
        ]

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )

        if result.returncode != 0:
            stderr_msg = result.stderr.decode("utf-8", errors="replace")[-500:]
            raise RuntimeError(f"ffmpeg failed (code {result.returncode}): {stderr_msg}")

        # Read converted WAV
        with open(out_path, "rb") as f:
            wav_bytes = f.read()

        if len(wav_bytes) < 100:
            raise RuntimeError("ffmpeg produced empty or invalid WAV output")

        logger.info(f"[AudioUtils] Converted {len(input_bytes)} bytes → {len(wav_bytes)} bytes WAV (16kHz mono)")
        return wav_bytes

    except subprocess.TimeoutExpired:
        raise RuntimeError("ffmpeg conversion timed out (>15s)")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Audio conversion failed: {str(e)}")
    finally:
        # Always cleanup temp files
        if in_path and os.path.exists(in_path):
            os.unlink(in_path)
        if out_path and os.path.exists(out_path):
            os.unlink(out_path)
