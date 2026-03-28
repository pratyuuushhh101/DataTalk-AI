"""
Diarization Microservice — FastAPI Server
==========================================
Production-grade FastAPI service that orchestrates:
  1. Audio ingestion (REST + WebSocket)
  2. VAD filtering
  3. Speaker diarization (Azure primary, pyannote fallback)
  4. Speaker embedding extraction
  5. Speaker clustering & role assignment
  6. Structured event emission

Endpoints:
  POST /diarize           — Single audio chunk diarization
  POST /session/create    — Create new speaker session
  GET  /session/{id}      — Get session state
  DELETE /session/{id}    — End session
  POST /session/{id}/calibrate — Force owner assignment
  WS   /ws/stream/{id}   — Real-time streaming diarization
  GET  /health            — Health check
"""

import os
import io
import time
import json
import asyncio
import logging
import numpy as np
import soundfile as sf
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vad_filter import VADFilter
from embedding_engine import EmbeddingEngine
from speaker_cluster import SessionRegistry
from audio_utils import convert_to_wav
from azure_diarizer import AzureDiarizerFactory

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("diarization.server")

# ── Global Instances (initialized at startup) ────────────────────────────────
vad_filter: VADFilter = None
embedding_engine: EmbeddingEngine = None
session_registry: SessionRegistry = None

SAMPLE_RATE = 16000


# ── Lifecycle ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy models once at startup."""
    global vad_filter, embedding_engine, session_registry

    logger.info("=" * 60)
    logger.info("🚀 Starting Speaker Diarization Microservice")
    logger.info("=" * 60)

    vad_filter = VADFilter()
    embedding_engine = EmbeddingEngine(device="cpu")
    session_registry = SessionRegistry()

    # Check Azure availability
    azure = AzureDiarizerFactory.get()
    if azure:
        logger.info("✅ Azure Diarizer: AVAILABLE")
    else:
        logger.warning("⚠️  Azure Diarizer: UNAVAILABLE (using pyannote fallback)")

    # Start background cleanup task
    cleanup_task = asyncio.create_task(_periodic_cleanup())

    logger.info("✅ All models loaded. Server ready.")
    yield

    # Shutdown
    cleanup_task.cancel()
    logger.info("🛑 Diarization server shutting down")


app = FastAPI(
    title="DataTalk Speaker Diarization Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ──────────────────────────────────────────────────
class SessionCreateRequest(BaseModel):
    session_id: str | None = None


class SessionCreateResponse(BaseModel):
    session_id: str
    status: str


class DiarizeRequest(BaseModel):
    session_id: str
    language: str = "en-IN"


class CalibrateRequest(BaseModel):
    speaker_id: str


class DiarizedSegment(BaseModel):
    speaker_id: str
    role: str
    text: str
    start: float
    end: float
    confidence: float
    is_new_speaker: bool


class DiarizeResponse(BaseModel):
    session_id: str
    segments: list[DiarizedSegment]
    session_state: dict


# ── Helper: Process Audio Pipeline ──────────────────────────────────────────
def _process_audio_chunk(
    audio: np.ndarray,
    session_id: str,
    language: str = "en-IN",
) -> dict:
    """
    Full processing pipeline for a single audio chunk.

    Pipeline:
      audio → VAD → diarize → embed → cluster → role assignment

    Returns structured result with segments and session state.
    """
    manager = session_registry.get_or_create(session_id)
    segments = []

    # Step 1: VAD filtering
    speech_segments = vad_filter.filter(audio, SAMPLE_RATE)
    if not speech_segments:
        return {
            "session_id": session_id,
            "segments": [],
            "session_state": manager.get_session_state(),
        }

    # Step 2: Try Azure diarization first
    azure_diarizer = AzureDiarizerFactory.get()
    azure_results = None

    if azure_diarizer:
        try:
            azure_results = azure_diarizer.transcribe_with_diarization(
                audio, SAMPLE_RATE, language
            )
        except Exception as e:
            logger.warning(f"[Pipeline] Azure diarization failed: {e}")
            azure_results = None

    # Step 3: Process each speech segment
    for seg in speech_segments:
        seg_audio = seg["audio"]

        # Extract embedding
        embedding = embedding_engine.extract(seg_audio, SAMPLE_RATE)
        if embedding is None:
            continue

        # Assign speaker via clustering
        assignment = manager.assign_speaker(embedding, seg["start"])

        # Find matching Azure transcript text (if available)
        transcript_text = ""
        if azure_results:
            seg_start_ms = seg["start"] * 1000
            seg_end_ms = seg["end"] * 1000
            for ar in azure_results:
                ar_start = ar["offset_ms"]
                ar_end = ar_start + ar["duration_ms"]
                # Overlap check
                if ar_start < seg_end_ms and ar_end > seg_start_ms:
                    transcript_text = ar.get("text", "")
                    break

        segments.append({
            "speaker_id": assignment["speaker_id"],
            "role": assignment["role"],
            "text": transcript_text,
            "start": seg["start"],
            "end": seg["end"],
            "confidence": assignment["confidence"],
            "is_new_speaker": assignment["is_new"],
        })

    return {
        "session_id": session_id,
        "segments": segments,
        "session_state": manager.get_session_state(),
    }


# ── REST Endpoints ───────────────────────────────────────────────────────────

@app.post("/extract-embedding")
async def extract_embedding(file: UploadFile = File(...)):
    """
    Stateless endpoint that takes an audio file, runs VAD,
    and returns a 192-dim L2-normalized ECAPA-TDNN vector.

    Accepts ANY browser audio format (webm, ogg, mp4, wav).
    Internally converts to 16kHz mono WAV via ffmpeg before processing.
    """
    try:
        raw_bytes = await file.read()

        if not raw_bytes or len(raw_bytes) < 1024:
            return JSONResponse({"vector": None, "error": f"Audio too small ({len(raw_bytes)} bytes)"})

        logger.info(f"[Embedding] Received {len(raw_bytes)} bytes, filename={file.filename}, type={file.content_type}")

        # Step 0: Convert ANY format to clean 16kHz mono WAV via ffmpeg
        try:
            wav_bytes = convert_to_wav(raw_bytes)
        except RuntimeError as conv_err:
            logger.error(f"[Embedding] Audio conversion failed: {conv_err}")
            return JSONResponse({"vector": None, "error": f"Audio conversion failed: {str(conv_err)}"})

        logger.info(f"[Embedding] Converted to WAV: {len(wav_bytes)} bytes")

        # Step 1: Read the clean WAV
        audio, sr = sf.read(io.BytesIO(wav_bytes))

        # Safety: ensure float32 mono (should already be from ffmpeg flags)
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        audio = audio.astype(np.float32)

        # Step 2: Strict VAD Filter
        segments = vad_filter.filter(audio, 16000)

        # Logging audio duration & energy
        audio_duration = len(audio) / 16000.0
        logger.info(f"🎤 Audio duration: {audio_duration:.2f}s")
        
        rms_energy = 20 * np.log10(np.sqrt(np.mean(audio ** 2)) + 1e-10)
        logger.info(f"🔊 Energy level: {rms_energy:.1f}dB")

        if not segments:
            if audio_duration > 1.0:
                logger.warning(f"[VAD FALLBACK] VAD rejected but duration={audio_duration:.2f}s > 1.0s. Overriding VAD.")
                segments = [{"audio": audio, "duration": audio_duration, "rms_db": float(rms_energy)}]
            else:
                return JSONResponse({"vector": None, "error": f"No speech detected (VAD rejected, len={audio_duration:.2f}s)"})

        # Step 3: Extract Embedding from the longest segment
        best_segment = max(segments, key=lambda x: x["duration"])
        
        if best_segment["duration"] < 1.2:
            logger.warning(f"[Embedding] Segment too short for reliable embedding: {best_segment['duration']:.2f}s < 1.2s")
            return JSONResponse({"vector": None, "error": f"too_short (len={best_segment['duration']:.2f}s)"})

        vector = embedding_engine.extract(best_segment["audio"], 16000)

        if vector is None:
            return JSONResponse({"vector": None, "error": "Segment extraction failed internals"})

        # vector is a numpy array of shape (192,)
        return JSONResponse({"vector": vector.tolist()})

    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    azure = AzureDiarizerFactory.get()
    return {
        "status": "healthy",
        "models": {
            "vad": vad_filter is not None,
            "embeddings": embedding_engine is not None,
            "azure_diarizer": azure is not None,
        },
        "active_sessions": session_registry.active_count,
        "timestamp": time.time(),
    }


@app.post("/session/create", response_model=SessionCreateResponse)
async def create_session(req: SessionCreateRequest):
    """Create a new speaker session."""
    import uuid
    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    session_registry.get_or_create(session_id)
    return SessionCreateResponse(session_id=session_id, status="created")


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get current session state."""
    manager = session_registry.get(session_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Session not found")
    return manager.get_session_state()


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """End and remove a session."""
    session_registry.remove(session_id)
    return {"status": "removed", "session_id": session_id}


@app.post("/session/{session_id}/calibrate")
async def calibrate_owner(session_id: str, req: CalibrateRequest):
    """Manually set which speaker cluster is the owner."""
    manager = session_registry.get(session_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Session not found")

    success = manager.force_set_owner(req.speaker_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Speaker {req.speaker_id} not found")

    return {
        "status": "calibrated",
        "owner": req.speaker_id,
        "session_state": manager.get_session_state(),
    }


@app.post("/diarize", response_model=DiarizeResponse)
async def diarize_audio(
    session_id: str,
    language: str = "en-IN",
    file: UploadFile = File(...),
):
    """
    Diarize a single audio chunk.

    Accepts: WAV, OGG, WebM audio files (16kHz mono preferred)
    Returns: Diarized segments with speaker assignments and roles
    """
    # Read and decode audio
    content = await file.read()

    try:
        audio, sr = sf.read(io.BytesIO(content), dtype="float32")
    except Exception:
        # Try raw PCM (int16, 16kHz, mono)
        try:
            audio = np.frombuffer(content, dtype=np.int16).astype(np.float32) / 32768.0
            sr = SAMPLE_RATE
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot decode audio: {e}")

    # Ensure mono
    if audio.ndim > 1:
        audio = audio.mean(axis=1)

    # Resample if needed
    if sr != SAMPLE_RATE:
        import librosa
        audio = librosa.resample(audio, orig_sr=sr, target_sr=SAMPLE_RATE)

    # Process through pipeline
    result = _process_audio_chunk(audio, session_id, language)

    return DiarizeResponse(
        session_id=result["session_id"],
        segments=[DiarizedSegment(**s) for s in result["segments"]],
        session_state=result["session_state"],
    )


# ── WebSocket Streaming ─────────────────────────────────────────────────────

@app.websocket("/ws/stream/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str):
    """
    Real-time streaming diarization via WebSocket.

    Protocol:
      Client → Server: raw PCM int16 audio bytes (16kHz, mono)
      Server → Client: JSON with diarized segments

    The client should send audio in ~3-5 second chunks.
    """
    await websocket.accept()
    logger.info(f"[WS] Client connected: session={session_id}")

    # Ensure session exists
    session_registry.get_or_create(session_id)

    # Reset VAD state for clean session
    vad_filter.reset()

    try:
        while True:
            # Receive raw audio bytes
            data = await websocket.receive_bytes()

            if len(data) < 1600:  # < 0.1s at 16kHz int16
                continue

            # Decode PCM int16 → float32
            audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0

            # Process through pipeline
            result = _process_audio_chunk(audio, session_id)

            # Send result
            await websocket.send_json(result)

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"[WS] Error in session {session_id}: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass


# ── Background Tasks ────────────────────────────────────────────────────────

async def _periodic_cleanup():
    """Periodically clean up expired sessions."""
    while True:
        await asyncio.sleep(300)  # Every 5 minutes
        session_registry.cleanup_expired()


# ── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("DIARIZATION_PORT", "8100"))
    uvicorn.run(
        "diarization_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
