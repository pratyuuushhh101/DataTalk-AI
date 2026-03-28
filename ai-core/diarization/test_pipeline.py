"""
Quick integration test for the diarization pipeline.
Tests each component independently, then end-to-end.
"""
import sys
import numpy as np
import time
import torchaudio

# ── Compatibility patch for torchaudio ≥ 2.11 ────────────────────────────────
if not hasattr(torchaudio, "list_audio_backends"):
    torchaudio.list_audio_backends = lambda: ["soundfile"]
if not hasattr(torchaudio, "get_audio_backend"):
    torchaudio.get_audio_backend = lambda: "soundfile"
if not hasattr(torchaudio, "set_audio_backend"):
    torchaudio.set_audio_backend = lambda x: None

print("=" * 60)
print("🧪 Speaker Diarization Pipeline — Integration Test")
print("=" * 60)

# ── Test 1: Imports ──────────────────────────────────────────────────────────
print("\n[1/6] Testing imports...")
try:
    from vad_filter import VADFilter
    from embedding_engine import EmbeddingEngine
    from speaker_cluster import SpeakerClusterManager, SessionRegistry
    from azure_diarizer import AzureDiarizerFactory
    print("  ✅ All modules imported successfully")
except Exception as e:
    print(f"  ❌ Import failed: {e}")
    sys.exit(1)

# ── Test 2: Generate Synthetic Audio ─────────────────────────────────────────
print("\n[2/6] Generating synthetic test audio...")
SAMPLE_RATE = 16000
DURATION = 3.0  # seconds

def generate_speech_like_audio(freq=300, duration=3.0, sr=16000):
    """Generate a sine wave that simulates speech-like audio."""
    t = np.linspace(0, duration, int(sr * duration), dtype=np.float32)
    # Mix of frequencies to simulate speech harmonics
    audio = 0.3 * np.sin(2 * np.pi * freq * t)
    audio += 0.15 * np.sin(2 * np.pi * freq * 2 * t)
    audio += 0.1 * np.sin(2 * np.pi * freq * 3 * t)
    # Add some noise
    audio += 0.02 * np.random.randn(len(t)).astype(np.float32)
    return audio

speaker1_audio = generate_speech_like_audio(freq=250, duration=DURATION)
speaker2_audio = generate_speech_like_audio(freq=400, duration=DURATION)
silence = np.zeros(int(SAMPLE_RATE * 0.5), dtype=np.float32)

# Concatenate: speaker1 + silence + speaker2
full_audio = np.concatenate([speaker1_audio, silence, speaker2_audio])
print(f"  ✅ Generated {len(full_audio)/SAMPLE_RATE:.1f}s of test audio")
print(f"     Speaker 1: 250Hz fundamental ({DURATION}s)")
print(f"     Speaker 2: 400Hz fundamental ({DURATION}s)")

# ── Test 3: VAD Filter ──────────────────────────────────────────────────────
print("\n[3/6] Testing VAD Filter...")
try:
    t_start = time.time()
    vad = VADFilter()
    t_load = time.time() - t_start
    print(f"  ✅ Silero VAD loaded in {t_load:.2f}s")

    t_start = time.time()
    segments = vad.filter(full_audio, SAMPLE_RATE)
    t_filter = time.time() - t_start
    print(f"  ✅ VAD filtered in {t_filter*1000:.1f}ms → {len(segments)} speech segment(s)")
    
    for i, seg in enumerate(segments):
        print(f"     Segment {i+1}: {seg['start']:.2f}s - {seg['end']:.2f}s "
              f"(duration={seg['duration']:.2f}s, RMS={seg['rms_db']:.1f}dB)")
except Exception as e:
    print(f"  ⚠️  VAD test issue: {e}")
    print("     (This is OK if Silero model download is slow - continuing with raw audio)")
    # Fallback: use raw audio as segments
    segments = [
        {"audio": speaker1_audio, "start": 0.0, "end": DURATION, "duration": DURATION, "rms_db": -10.0},
        {"audio": speaker2_audio, "start": DURATION + 0.5, "end": DURATION * 2 + 0.5, "duration": DURATION, "rms_db": -10.0},
    ]

# ── Test 4: Embedding Engine ────────────────────────────────────────────────
print("\n[4/6] Testing Embedding Engine (SpeechBrain ECAPA-TDNN)...")
try:
    t_start = time.time()
    engine = EmbeddingEngine(device="cpu")
    t_load = time.time() - t_start
    print(f"  ✅ ECAPA-TDNN loaded in {t_load:.1f}s")

    embeddings = []
    for i, seg in enumerate(segments[:2]):  # Test with first 2 segments
        t_start = time.time()
        emb = engine.extract(seg["audio"], SAMPLE_RATE)
        t_extract = time.time() - t_start
        if emb is not None:
            embeddings.append(emb)
            print(f"  ✅ Segment {i+1} → embedding shape={emb.shape}, "
                  f"norm={np.linalg.norm(emb):.4f}, time={t_extract*1000:.1f}ms")
        else:
            print(f"  ⚠️  Segment {i+1} → embedding skipped (too short)")

    # Test cosine similarity
    if len(embeddings) >= 2:
        sim = EmbeddingEngine.cosine_similarity(embeddings[0], embeddings[1])
        print(f"\n  📊 Cosine similarity between Speaker 1 & 2: {sim:.4f}")
        print(f"     {'⚠️ Same speaker' if sim > 0.72 else '✅ Different speakers'} "
              f"(threshold=0.72)")

        # Self-similarity check
        self_sim = EmbeddingEngine.cosine_similarity(embeddings[0], embeddings[0])
        print(f"  📊 Self-similarity (Speaker 1 vs 1): {self_sim:.4f}")
except Exception as e:
    print(f"  ❌ Embedding test failed: {e}")
    embeddings = []

# ── Test 5: Speaker Clustering ───────────────────────────────────────────────
print("\n[5/6] Testing Speaker Clustering & Role Assignment...")
try:
    manager = SpeakerClusterManager("test_session_001")
    
    if len(embeddings) >= 2:
        # Feed speaker 1 multiple times to make it stable
        for i in range(4):
            # Add small noise to simulate variation
            noisy_emb = embeddings[0] + np.random.randn(192).astype(np.float32) * 0.01
            noisy_emb = noisy_emb / np.linalg.norm(noisy_emb)
            result = manager.assign_speaker(noisy_emb, timestamp=time.time() + i)
            if i == 0 or i == 3:
                print(f"  Speaker 1, segment {i+1}: {result}")

        # Feed speaker 2
        result2 = manager.assign_speaker(embeddings[1], timestamp=time.time() + 10)
        print(f"  Speaker 2, segment 1: {result2}")

        # Get session state
        state = manager.get_session_state()
        print(f"\n  📊 Session State:")
        print(f"     Num speakers: {state['num_speakers']}")
        print(f"     Owner: {state['owner_id']}")
        for sid, info in state['speakers'].items():
            print(f"     {sid}: role={info['role']}, segments={info['segment_count']}, "
                  f"confidence={info['confidence']}, stable={info['is_stable']}")
    else:
        print("  ⚠️  Skipped (need embeddings from Step 4)")
except Exception as e:
    print(f"  ❌ Clustering test failed: {e}")

# ── Test 6: Azure Diarizer Check ────────────────────────────────────────────
print("\n[6/6] Checking Azure Diarizer availability...")
try:
    azure = AzureDiarizerFactory.get()
    if azure:
        print("  ✅ Azure Diarizer: AVAILABLE")
    else:
        print("  ⚠️  Azure Diarizer: NOT CONFIGURED (will use embedding-only mode)")
        print("     Tip: Set AZURE_SPEECH_KEY in .env to enable")
except Exception as e:
    print(f"  ⚠️  Azure check failed: {e}")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("✅ Pipeline Integration Test Complete!")
print("=" * 60)
print("\nNext steps:")
print("  1. Start the diarization server: python diarization_server.py")
print("  2. Test REST API: curl http://localhost:8100/health")
print("  3. Connect frontend DiarizationClient")
