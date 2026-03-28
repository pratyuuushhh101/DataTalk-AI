/**
 * Diarization Service (Frontend)
 * ================================
 * Client-side audio processing and WebSocket streaming for
 * real-time speaker diarization.
 *
 * Features:
 *   - Audio chunking from microphone stream
 *   - Client-side VAD (voice activity detection)
 *   - WebSocket streaming to diarization backend
 *   - Session lifecycle management
 *   - Structured event callbacks
 *
 * Usage:
 *   import { DiarizationClient } from './diarization.service';
 *
 *   const client = new DiarizationClient({
 *     onSegment: (segment) => console.log(segment),
 *     onSessionUpdate: (state) => console.log(state),
 *   });
 *
 *   await client.startSession();
 *   // ... audio streams automatically ...
 *   await client.endSession();
 */

// ── Config ──────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const DIARIZATION_WS_URL = import.meta.env.VITE_DIARIZATION_WS_URL || "ws://localhost:8100";

const CHUNK_DURATION_MS = 4000;      // Send 4-second chunks
const SAMPLE_RATE = 16000;           // 16kHz mono
const SILENCE_THRESHOLD = 0.01;      // RMS threshold for silence detection
const MIN_CHUNK_ENERGY = 0.005;      // Minimum energy to send a chunk

// ── Audio Chunker Class ─────────────────────────────────────────────────────

class AudioChunker {
    /**
     * Chunks continuous microphone PCM into fixed-duration windows.
     * Includes client-side energy-based silence detection.
     */
    constructor(chunkDurationMs = CHUNK_DURATION_MS, sampleRate = SAMPLE_RATE) {
        this.chunkDurationMs = chunkDurationMs;
        this.sampleRate = sampleRate;
        this.samplesPerChunk = Math.floor((sampleRate * chunkDurationMs) / 1000);
        this.buffer = new Float32Array(0);
    }

    /**
     * Add audio samples to the buffer.
     * @param {Float32Array} samples - New audio samples
     * @returns {Int16Array[]} Array of ready chunks (may be empty)
     */
    addSamples(samples) {
        // Append to buffer
        const newBuffer = new Float32Array(this.buffer.length + samples.length);
        newBuffer.set(this.buffer, 0);
        newBuffer.set(samples, this.buffer.length);
        this.buffer = newBuffer;

        // Extract complete chunks
        const chunks = [];
        while (this.buffer.length >= this.samplesPerChunk) {
            const chunk = this.buffer.slice(0, this.samplesPerChunk);
            this.buffer = this.buffer.slice(this.samplesPerChunk);

            // Energy check — skip silence
            const energy = this._computeRMS(chunk);
            if (energy > MIN_CHUNK_ENERGY) {
                // Convert float32 → int16 for transport
                chunks.push(this._float32ToInt16(chunk));
            }
        }

        return chunks;
    }

    /**
     * Flush remaining buffer (end of session).
     * @returns {Int16Array|null}
     */
    flush() {
        if (this.buffer.length < this.sampleRate * 0.5) {
            // Less than 0.5s — too short
            this.buffer = new Float32Array(0);
            return null;
        }

        const chunk = this.buffer;
        this.buffer = new Float32Array(0);

        const energy = this._computeRMS(chunk);
        if (energy < MIN_CHUNK_ENERGY) return null;

        return this._float32ToInt16(chunk);
    }

    reset() {
        this.buffer = new Float32Array(0);
    }

    _computeRMS(samples) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }

    _float32ToInt16(float32Array) {
        const int16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16;
    }
}


// ── Diarization Client ──────────────────────────────────────────────────────

export class DiarizationClient {
    /**
     * @param {Object} options
     * @param {Function} options.onSegment   - Called with each diarized segment
     * @param {Function} options.onSessionUpdate - Called with session state updates
     * @param {Function} options.onError     - Called on error
     * @param {Function} options.onSpeakerChange - Called when speaker changes
     */
    constructor(options = {}) {
        this.onSegment = options.onSegment || (() => { });
        this.onSessionUpdate = options.onSessionUpdate || (() => { });
        this.onError = options.onError || console.error;
        this.onSpeakerChange = options.onSpeakerChange || (() => { });

        this.sessionId = null;
        this.ws = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.processor = null;
        this.chunker = new AudioChunker();
        this.isStreaming = false;
        this.lastSpeakerId = null;

        // ── Rolling Audio Buffer (last ~5s of raw PCM for voice-orchestrator) ──
        this._rollingBuffer = new Float32Array(0);
        this._maxRollingSeconds = 5;
        this._rollingSampleRate = SAMPLE_RATE;

        console.log("[Diarization] Client initialized");
    }

    /**
     * Get the latest captured audio as a WAV Blob.
     * Returns the last ~5 seconds of mic audio for speaker identification.
     */
    getLatestAudioBlob() {
        if (this._rollingBuffer.length < this._rollingSampleRate * 0.5) {
            console.warn("[Diarization] Rolling buffer too short for audio export");
            return null;
        }

        // Convert float32 PCM → 16-bit WAV
        const numSamples = this._rollingBuffer.length;
        const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(wavBuffer);

        // WAV header
        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);         // Subchunk1Size
        view.setUint16(20, 1, true);          // PCM
        view.setUint16(22, 1, true);          // Mono
        view.setUint32(24, SAMPLE_RATE, true); // SampleRate
        view.setUint32(28, SAMPLE_RATE * 2, true); // ByteRate
        view.setUint16(32, 2, true);          // BlockAlign
        view.setUint16(34, 16, true);         // BitsPerSample
        writeString(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        // PCM data
        for (let i = 0; i < numSamples; i++) {
            const s = Math.max(-1, Math.min(1, this._rollingBuffer[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        console.log(`[Diarization] Audio blob exported: ${(blob.size / 1024).toFixed(1)}KB, ${(numSamples / SAMPLE_RATE).toFixed(1)}s`);
        return blob;
    }

    // ── Session Lifecycle ───────────────────────────────────────────────────

    /**
     * Start a new diarization session.
     * Creates session on backend, opens WebSocket, starts mic capture.
     */
    async startSession(existingSessionId = null) {
        try {
            // 1. Create session via REST
            const res = await fetch(`${BACKEND_URL}/speaker/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: existingSessionId }),
            });
            const data = await res.json();
            this.sessionId = data.sessionId;

            console.log(`[Diarization] Session created: ${this.sessionId}`);

            // 2. Open WebSocket connection
            this._connectWebSocket();

            // 3. Start microphone capture
            await this._startMicCapture();

            this.isStreaming = true;
            return this.sessionId;
        } catch (err) {
            this.onError(`[Diarization] Failed to start session: ${err.message}`);
            throw err;
        }
    }

    /**
     * End the current session and cleanup all resources.
     */
    async endSession() {
        this.isStreaming = false;

        // Flush remaining audio
        const lastChunk = this.chunker.flush();
        if (lastChunk && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(lastChunk.buffer);
        }

        // Stop mic
        this._stopMicCapture();

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // End session on backend
        if (this.sessionId) {
            try {
                await fetch(`${BACKEND_URL}/speaker/session/${this.sessionId}`, {
                    method: "DELETE",
                });
                console.log(`[Diarization] Session ended: ${this.sessionId}`);
            } catch (err) {
                console.warn("[Diarization] Failed to end remote session:", err.message);
            }
        }

        this.sessionId = null;
        this.chunker.reset();
    }

    /**
     * Manually calibrate owner speaker.
     */
    async calibrateOwner(speakerId) {
        if (!this.sessionId) throw new Error("No active session");

        const res = await fetch(
            `${BACKEND_URL}/speaker/session/${this.sessionId}/calibrate`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ speakerId }),
            }
        );

        return await res.json();
    }

    /**
     * Get current session state.
     */
    async getSessionState() {
        if (!this.sessionId) return null;

        const res = await fetch(`${BACKEND_URL}/speaker/session/${this.sessionId}`);
        return await res.json();
    }

    /**
     * Identify current speaker role (for integration with voice orchestrator).
     */
    async identifySpeaker() {
        if (!this.sessionId) return { role: "unknown", confidence: 0 };

        const res = await fetch(`${BACKEND_URL}/speaker/identify/${this.sessionId}`);
        return await res.json();
    }

    // ── WebSocket Management ────────────────────────────────────────────────

    _connectWebSocket() {
        const wsUrl = `${DIARIZATION_WS_URL}/ws/stream/${this.sessionId}`;
        console.log(`[Diarization] Connecting WebSocket: ${wsUrl}`);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("[Diarization] WebSocket connected ✅");
        };

        this.ws.onmessage = (event) => {
            try {
                const result = JSON.parse(event.data);
                this._handleDiarizationResult(result);
            } catch (err) {
                this.onError(`[Diarization] Failed to parse WS message: ${err.message}`);
            }
        };

        this.ws.onclose = (event) => {
            console.log(`[Diarization] WebSocket closed (code=${event.code})`);
            if (this.isStreaming) {
                // Auto-reconnect after 2 seconds
                console.log("[Diarization] Auto-reconnecting in 2s...");
                setTimeout(() => this._connectWebSocket(), 2000);
            }
        };

        this.ws.onerror = (event) => {
            this.onError("[Diarization] WebSocket error");
        };
    }

    // ── Microphone Capture ──────────────────────────────────────────────────

    async _startMicCapture() {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: SAMPLE_RATE,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: SAMPLE_RATE,
        });

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);

        // Use ScriptProcessorNode for compatibility (AudioWorklet is preferable in production)
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.processor.onaudioprocess = (event) => {
            if (!this.isStreaming) return;

            const inputData = event.inputBuffer.getChannelData(0);

            // ── Feed rolling buffer (for voice-orchestrator audio export) ──
            const maxSamples = this._maxRollingSeconds * this._rollingSampleRate;
            const newRolling = new Float32Array(this._rollingBuffer.length + inputData.length);
            newRolling.set(this._rollingBuffer, 0);
            newRolling.set(inputData, this._rollingBuffer.length);
            // Trim to last N seconds
            if (newRolling.length > maxSamples) {
                this._rollingBuffer = newRolling.slice(newRolling.length - maxSamples);
            } else {
                this._rollingBuffer = newRolling;
            }

            const chunks = this.chunker.addSamples(inputData);

            // Send each ready chunk via WebSocket
            for (const chunk of chunks) {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(chunk.buffer);
                }
            }
        };

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        console.log("[Diarization] Microphone capture started 🎤");
    }

    _stopMicCapture() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        console.log("[Diarization] Microphone capture stopped");
    }

    // ── Result Handling ─────────────────────────────────────────────────────

    _handleDiarizationResult(result) {
        if (!result || !result.segments) return;

        for (const segment of result.segments) {
            // Emit segment event
            this.onSegment(segment);

            // Detect speaker change
            if (segment.speaker_id !== this.lastSpeakerId) {
                this.onSpeakerChange({
                    previousSpeaker: this.lastSpeakerId,
                    currentSpeaker: segment.speaker_id,
                    role: segment.role,
                    confidence: segment.confidence,
                });
                this.lastSpeakerId = segment.speaker_id;
            }
        }

        // Emit session update
        if (result.session_state) {
            this.onSessionUpdate(result.session_state);
        }
    }
}


// ── Convenience Export: Simple Integration Function ─────────────────────────

/**
 * Quick integration helper for existing frontend code.
 * Wraps DiarizationClient for use with the existing speech service.
 *
 * Usage:
 *   const { getSpeakerRole, start, stop } = createDiarizationHelper();
 *   await start();
 *   // ... later, when you have a transcript ...
 *   const { role, confidence } = await getSpeakerRole();
 */
export function createDiarizationHelper() {
    let client = null;

    return {
        start: async () => {
            client = new DiarizationClient({
                onSegment: (seg) => {
                    console.log(`[${seg.role}] ${seg.speaker_id}: "${seg.text}"`);
                },
                onSpeakerChange: (change) => {
                    console.log(
                        `[Speaker Change] ${change.previousSpeaker} → ` +
                        `${change.currentSpeaker} (${change.role})`
                    );
                },
            });
            return await client.startSession();
        },

        stop: async () => {
            if (client) {
                await client.endSession();
                client = null;
            }
        },

        getSpeakerRole: async () => {
            if (!client) return { role: "unknown", confidence: 0 };
            return await client.identifySpeaker();
        },

        getClient: () => client,
    };
}

export default DiarizationClient;
