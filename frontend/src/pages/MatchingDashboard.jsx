import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, Mic, ShieldCheck, Zap, RefreshCw,
    CheckCircle2, AlertCircle, X, Power,
    Flame, MicOff, MessageSquare
} from 'lucide-react';
import { startTranscription, stopTranscription } from '../services/speech.service';
import { DiarizationClient } from '../services/diarization.service';
import { AIResponseCard } from '../components/AIResponseCard';

const SYNC_BACKEND = "http://localhost:5000/demo";

// ── Role Label Formatter ────────────────────────────────────────────────────
function SpeakerBadge({ role, displayConfidence, className = "" }) {
    if (role === "owner") {
        return (
            <div className={`flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#10b981] ${className}`}>
                <span className="text-sm">🧑‍💼</span> Owner
                {displayConfidence !== null && (
                    <span className="ml-1 text-emerald-500/60 font-medium normal-case">({displayConfidence}%)</span>
                )}
            </div>
        );
    }

    // Default everything else to Customer (no percentages)
    return (
        <div className={`flex items-center gap-1.5 font-bold uppercase tracking-widest text-orange-400 ${className}`}>
            <span className="text-sm">👤</span> Customer
        </div>
    );
}

function getRoleColor(role) {
    switch (role) {
        case "owner": return "text-emerald-400";
        case "customer": return "text-orange-400";
        case "uncertain": return "text-yellow-500";
        default: return "text-gray-400";
    }
}

const MatchingDashboard = () => {
    // ══════════════════════════════════════════════════════════════
    // SINGLE SESSION STATE — controls mic + camera + pipeline
    // ══════════════════════════════════════════════════════════════
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [aiResponses, setAiResponses] = useState([]);

    const [session, setSession] = useState({
        cv_items: {},
        audio_items: {},
        audio_total: null,
        expected_total: null,
        alerts: []
    });
    const [status, setStatus] = useState("Idle");
    const [comparison, setComparison] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [liveTranscript, setLiveTranscript] = useState("");

    // ── DUAL LOG SYSTEM ─────────────────────────────────────────────────────
    const [conversationLog, setConversationLog] = useState([]);
    const [actionLog, setActionLog] = useState([]);
    const [activeLogTab, setActiveLogTab] = useState("conversation"); // "conversation" | "action"

    // ── Camera Selection State ──
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(localStorage.getItem('preferredCamera') || "");
    const [ipCameraUrl, setIpCameraUrl] = useState(localStorage.getItem('ipCameraUrl') || "http://192.168.1.100:8080");

    const videoRef = useRef(null);
    const lastFrameRef = useRef(null);
    const recognizerRef = useRef(null);
    const diarizationClientRef = useRef(null);
    const sessionActiveRef = useRef(false);
    const conversationEndRef = useRef(null);
    const actionEndRef = useRef(null);

    useEffect(() => {
        sessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    // Auto-scroll logs
    useEffect(() => {
        if (activeLogTab === "conversation") {
            conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            actionEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversationLog, actionLog, activeLogTab]);

    // ── Centralized Event Emitter ───────────────────────────────────────────
    const emitEvent = useCallback((event) => {
        if (event.type === "speech") {
            if (!event.text || event.text.trim() === "") return; // NEVER log empty speech
            setConversationLog(prev => [...prev, {
                role: event.role || "unknown",
                text: event.text,
                speakerId: event.speakerId || null,
                confidence: event.confidence || 0,
                displayConfidence: event.displayConfidence || null,
                timestamp: Date.now()
            }]);
        } else {
            // System / action event
            setActionLog(prev => [...prev, {
                message: event.message,
                level: event.level || "info", // info, warn, error, success
                timestamp: Date.now()
            }]);
        }
    }, []);

    // ── Capture frame (only if session active) ──
    const captureFrame = useCallback(() => {
        if (!sessionActiveRef.current) {
            return { image: lastFrameRef.current, ipCameraUrl: selectedDeviceId === "IP_CAMERA" ? ipCameraUrl : null };
        }

        if (selectedDeviceId === "IP_CAMERA") {
            return { image: null, ipCameraUrl };
        }

        if (!videoRef.current) return { image: lastFrameRef.current, ipCameraUrl: null };
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (canvas.width === 0 || canvas.height === 0) return { image: lastFrameRef.current, ipCameraUrl: null };

        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);
        const b64 = canvas.toDataURL("image/jpeg", 0.7);
        lastFrameRef.current = b64; // Store for fallback
        return { image: b64, ipCameraUrl: null };
    }, [selectedDeviceId, ipCameraUrl]);

    // ── Lightweight session polling ──
    const fetchSession = async () => {
        try {
            const res = await fetch(`${SYNC_BACKEND}/session`);
            const data = await res.json();
            setSession(data);
            if (data.alerts?.length > 0) {
                setAlerts(prev => {
                    const existing = prev.map(a => a.message);
                    const unique = data.alerts.filter(a => !existing.includes(a.message));
                    return [...prev, ...unique];
                });
            }
        } catch (err) { /* ignore polling errors */ }
    };

    useEffect(() => {
        const interval = setInterval(fetchSession, 5000);
        return () => clearInterval(interval);
    }, []);

    // ── Enumerate Camera Devices ──
    useEffect(() => {
        async function getCameras() {
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                tempStream.getTracks().forEach(t => t.stop());

                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                videoInputs.push({ deviceId: "IP_CAMERA", label: "🌐 Network IP Camera" });

                setVideoDevices(videoInputs);
                if (!selectedDeviceId && videoInputs.length > 0) {
                    const firstId = videoInputs[0].deviceId;
                    setSelectedDeviceId(firstId);
                    localStorage.setItem('preferredCamera', firstId);
                }
            } catch (err) {
                console.error("Error enumerating devices:", err);
            }
        }
        getCameras();
    }, []);

    const handleCameraChange = async (e) => {
        const newDeviceId = e.target.value;
        setSelectedDeviceId(newDeviceId);
        localStorage.setItem('preferredCamera', newDeviceId);

        if (isSessionActive) {
            stopCamera();
            if (newDeviceId === "IP_CAMERA") {
                emitEvent({ type: "system", message: "Swapped to IP Camera Network Feed", level: "info" });
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: newDeviceId ? { deviceId: { exact: newDeviceId } } : { facingMode: "environment" }
                    });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                    emitEvent({ type: "system", message: "Camera stream swapped", level: "success" });
                } catch (err) {
                    emitEvent({ type: "system", message: "Camera swap failed: " + err.message, level: "error" });
                }
            }
        }
    };

    // ══════════════════════════════════════════════════════════════
    // START SESSION
    // ══════════════════════════════════════════════════════════════
    const startSession = async () => {
        if (isSessionActive) return;

        setConversationLog([]);
        setActionLog([]);
        setAlerts([]);
        setComparison(null);
        setStatus("Starting...");

        emitEvent({ type: "system", message: "Session starting...", level: "info" });

        // 1. Reset backend
        try {
            await fetch(`${SYNC_BACKEND}/reset`, { method: 'POST' });
            emitEvent({ type: "system", message: "Backend reset", level: "success" });
        } catch (err) {
            emitEvent({ type: "system", message: "Backend reset failed", level: "error" });
        }

        // 2. Start camera
        try {
            if (selectedDeviceId === "IP_CAMERA") {
                if (!ipCameraUrl) {
                    emitEvent({ type: "system", message: "IP Camera URL is missing!", level: "error" });
                    setStatus("Error");
                    return;
                }
                emitEvent({ type: "system", message: "Connected to IP Camera stream", level: "success" });
            } else {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: "environment" }
                });
                if (videoRef.current) videoRef.current.srcObject = stream;
                emitEvent({ type: "system", message: "Local Camera active", level: "success" });
            }
        } catch (err) {
            emitEvent({ type: "system", message: "Camera failed: " + err.message, level: "error" });
            setStatus("Error");
            return;
        }

        // 3. Start Diarization
        try {
            diarizationClientRef.current = new DiarizationClient({
                onSegment: (seg) => {
                    // ── Role is attached BEFORE text is logged ──
                    emitEvent({
                        type: "speech",
                        role: seg.role || "unknown",
                        text: seg.text,
                        speakerId: seg.speaker_id,
                        confidence: seg.confidence,
                        displayConfidence: seg.displayConfidence || null
                    });
                },
                onSpeakerChange: (change) => {
                    const roles = { owner: "Owner", customer: "Customer", uncertain: "Unknown" };
                    const label = roles[change.role] || "Unknown";
                    emitEvent({ type: "system", message: `Speaker shifted to ${label}`, level: "info" });
                }
            });
            await diarizationClientRef.current.startSession();
            emitEvent({ type: "system", message: "Diarization Engine active", level: "success" });
        } catch (err) {
            emitEvent({ type: "system", message: "Diarization failed: " + err.message, level: "warn" });
        }

        // 4. Start mic
        try {
            const recognizer = startTranscription(async (text, isFinal) => {
                if (!sessionActiveRef.current) return;
                if (!text || text.trim() === "") return;

                setLiveTranscript(text);
                if (!isFinal) return;

                // Log the speech with role from the latest diarization context
                // Role will be determined by the backend on the full pipeline response
                emitEvent({
                    type: "speech",
                    role: "unknown", // Will be overridden by backend response
                    text: text,
                    speakerId: null
                });

                const raw = text.toLowerCase();
                const isTotal = raw.includes("total") || raw.includes("bill") || raw.includes("hisab");

                if (isTotal) {
                    setStatus("Processing...");
                    emitEvent({ type: "system", message: "'Total' keyword detected → pipeline firing...", level: "info" });
                }

                // ── Build FormData payload (multipart/form-data for audio) ──
                const formData = new FormData();
                formData.append("transcript", text);
                formData.append("speakerSessionId", diarizationClientRef.current?.sessionId || "");
                formData.append("shopId", "shop_112");

                // Capture audio blob from diarization client's rolling buffer
                const audioBlob = diarizationClientRef.current?.getLatestAudioBlob();
                if (audioBlob && audioBlob.size > 0) {
                    formData.append("audio", audioBlob, `chunk_${Date.now()}.wav`);
                    console.log(`[PIPELINE] 🎤 Audio attached: ${(audioBlob.size / 1024).toFixed(1)}KB, type=${audioBlob.type}`);
                } else {
                    console.warn("[PIPELINE] ⚠️ No audio blob available from diarization client");
                }

                const frameData = captureFrame();
                const isQuestion = raw.includes("kitna") || raw.includes("kitne") || raw.includes("hua");

                if (isTotal || isQuestion) {
                    if (frameData.image) {
                        formData.append("image", frameData.image);
                        emitEvent({ type: "system", message: `Frame attached for ${isTotal ? 'Transaction' : 'Verification'}`, level: "info" });
                    } else if (frameData.ipCameraUrl) {
                        formData.append("ipCameraUrl", frameData.ipCameraUrl);
                        emitEvent({ type: "system", message: "Network snap trigger attached", level: "info" });
                    }
                }

                try {
                    const res = await fetch(`${SYNC_BACKEND}/voice-orchestrator`, {
                        method: 'POST',
                        body: formData  // No Content-Type header — browser sets multipart boundary automatically
                    });
                    const data = await res.json();
                    handlePipelineResponse(data, text);
                    fetchSession();
                } catch (err) {
                    emitEvent({ type: "system", message: "Network Error communicating with backend", level: "error" });
                }
            });
            recognizerRef.current = recognizer;
            emitEvent({ type: "system", message: "Microphone active", level: "success" });
        } catch (err) {
            emitEvent({ type: "system", message: "Mic failed: " + err.message, level: "error" });
            stopCamera();
            setStatus("Error");
            return;
        }

        setIsSessionActive(true);
        setStatus("Active");
        setLiveTranscript("");
        emitEvent({ type: "system", message: "SESSION ACTIVE — speak to bill items", level: "success" });
    };

    // ══════════════════════════════════════════════════════════════
    // STOP SESSION
    // ══════════════════════════════════════════════════════════════
    const stopSession = async () => {
        if (!isSessionActive) return;
        setIsSessionActive(false);

        if (recognizerRef.current) {
            stopTranscription(recognizerRef.current);
            recognizerRef.current = null;
        }
        if (diarizationClientRef.current) {
            await diarizationClientRef.current.endSession();
            diarizationClientRef.current = null;
        }
        stopCamera();

        try {
            await fetch(`${SYNC_BACKEND}/reset`, { method: 'POST' });
        } catch (err) { /* ignore */ }

        setStatus("Idle");
        setLiveTranscript("");
        setSession({ cv_items: {}, audio_items: {}, audio_total: null, expected_total: null, alerts: [] });
        setComparison(null);
        setAlerts([]);
        emitEvent({ type: "system", message: "Session stopped. All resources released.", level: "info" });
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    };

    // ── Handle all pipeline responses ──
    const handlePipelineResponse = (data, originalText) => {
        // Attach speaker role from backend response to conversation log retroactively
        if (data.speaker && originalText) {
            // Update the last conversation entry with the correct role from backend
            setConversationLog(prev => {
                const updated = [...prev];
                // Find the most recent entry matching this text
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].text === originalText && updated[i].role === "unknown") {
                        updated[i] = {
                            ...updated[i],
                            role: data.speaker.role,
                            confidence: data.speaker.confidence,
                            displayConfidence: data.speaker.displayConfidence
                        };
                        break;
                    }
                }
                return updated;
            });
        }

        // Handle silent pass — AI decided not to trigger, do NOT interrupt or log
        if (data.status === "silent_pass") {
            // Only update speaker role retroactively, zero noise
            return;
        }

        // Handle blocked/uncertain responses from the owner gate
        if (data.status === "blocked") {
            emitEvent({ type: "system", message: `🚫 BLOCKED: ${data.message}`, level: "warn" });
            return;
        }
        if (data.status === "uncertain") {
            emitEvent({ type: "system", message: `⚠️ ${data.message}`, level: "warn" });
            return;
        }

        if (data.type === "ai_response") {
            setAiResponses(prev => {
                const now = Date.now();
                const isDuplicate = prev.some(r => r.message === data.message && (now - r.timestamp) < 3000);
                if (isDuplicate) return prev;
                return [{ ...data, timestamp: now }, ...prev];
            });
            emitEvent({ type: "system", message: `AI (${data.category}): ${data.message}`, level: "info" });
            setStatus("Active");
            return;
        }

        if (data.status === "ok" || data.status === "mismatch" || data.status === "partial") {
            setComparison(data);
            setStatus(data.status === "ok" ? "✓ Verified" : data.status === "mismatch" ? "⚠ Mismatch" : "Partial");
            if (data.session) setSession(data.session);

            emitEvent({ type: "system", message: `Audio: ${Object.entries(data.audio_items || {}).map(([k, v]) => `${k} x${v}`).join(", ") || "none"}`, level: "info" });
            emitEvent({ type: "system", message: `CV (${data.cv_source}): ${Object.entries(data.items_detected || {}).map(([k, v]) => `${k} x${v}`).join(", ")}`, level: "info" });
            emitEvent({ type: "system", message: `Expected: ₹${data.expected_total}  |  Stated: ₹${data.audio_total}`, level: "info" });
            emitEvent({ type: "system", message: `${data.status.toUpperCase()} (Δ ₹${data.difference?.toFixed(2) || 0})`, level: data.status === "mismatch" ? "error" : "success" });

            if (data.missing_items?.length > 0) {
                emitEvent({ type: "system", message: `Unbilled: ${data.missing_items.map(i => `${i.product}(x${i.cv_qty})`).join(", ")}`, level: "error" });
            }

            if (data.status === "mismatch") {
                const unbilled = data.missing_items?.map(i => i.product).join(", ");
                setAlerts(prev => [{
                    type: 'mismatch',
                    message: `Vision ₹${data.expected_total} vs Stated ₹${data.audio_total}${unbilled ? ` | Unbilled: ${unbilled}` : ""}`
                }, ...prev]);
            }

        } else if (data.status === "no_items") {
            setStatus("No Items");
            emitEvent({ type: "system", message: "No CV items detected", level: "warn" });

        } else if (data.status === "no_image") {
            setStatus("No Camera");
            emitEvent({ type: "system", message: "No frame captured — camera issue", level: "warn" });

        } else if (data.status === "accumulating") {
            setStatus("Active");
            emitEvent({ type: "system", message: `Intent Logged: ${data.message}`, level: "info" });

        } else if (data.status === "reset_done") {
            setSession(data.session || { cv_items: {}, audio_items: {}, audio_total: null, expected_total: null, alerts: [] });
            setStatus("Active");
            setComparison(null);
            setAlerts([]);
            emitEvent({ type: "system", message: "Reset. Ready for next.", level: "success" });
            setLiveTranscript("");

        } else if (data.status === "busy") {
            emitEvent({ type: "system", message: "Backend Busy: Processing previous command.", level: "warn" });

        } else if (data.error) {
            emitEvent({ type: "system", message: `Error: ${data.error}`, level: "error" });
        }
    };

    const removeAlert = (idx) => setAlerts(prev => prev.filter((_, i) => i !== idx));

    const isMismatch = status.includes("Mismatch");
    const isOK = status.includes("Verified");

    // ══════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-10 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Floating Alerts */}
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full max-w-md">
                <AnimatePresence>
                    {alerts.map((alert, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className={`w-full p-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${alert.type === 'mismatch' ? 'bg-red-600/20 border-red-500/50 text-red-400' :
                                alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                    'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-current/10">
                                {alert.type === 'mismatch' ? <AlertCircle size={20} className="animate-pulse" /> : <Zap size={20} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-widest mb-1">{
                                    alert.type === 'mismatch' ? '🚨 THEFT DETECTED' : 'Alert'
                                }</p>
                                <p className="text-sm font-medium leading-tight">{alert.message}</p>
                            </div>
                            <button onClick={() => removeAlert(idx)}><X size={16} /></button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col gap-8 relative">

                {/* ── AI Responses Floating Overlay ── */}
                <div className="absolute top-0 right-0 z-50 flex flex-col gap-3 max-h-[40vh] overflow-y-auto pointer-events-none p-4 custom-scrollbar">
                    <AnimatePresence>
                        {aiResponses.map((res) => (
                            <div key={res.timestamp} className="pointer-events-auto min-w-[320px] max-w-sm ml-auto">
                                <AIResponseCard
                                    response={res}
                                    onDismiss={(ts) => setAiResponses(prev => prev.filter(r => r.timestamp !== ts))}
                                />
                            </div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg"><ShieldCheck className="text-blue-400 w-6 h-6" /></div>
                            <h1 className="text-3xl font-bold tracking-tight">Sync <span className="text-blue-400">Center</span></h1>
                        </div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Vision-Voice Reconciliation</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`px-6 py-2.5 rounded-2xl border flex items-center gap-3 text-sm font-black transition-all duration-700 shadow-xl ${isMismatch ? 'bg-red-500 text-white border-red-400 scale-105 animate-pulse' :
                            isOK ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                isSessionActive ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                    'bg-white/5 text-gray-500 border-white/10'}`}>
                            {isMismatch ? <AlertCircle size={18} /> : isOK ? <CheckCircle2 size={18} /> : isSessionActive ? <Zap size={18} className="animate-pulse" /> : <Power size={18} />}
                            {status.toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Vision Feed (Left) */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-[#111114] border border-white/5 rounded-3xl p-6 h-full flex flex-col overflow-hidden relative">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Camera size={14} className={isSessionActive ? "text-emerald-400" : "text-gray-600"} />
                                    Counter Vision
                                    {isSessionActive && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
                                </h3>
                                {videoDevices.length > 0 && (
                                    <select
                                        value={selectedDeviceId}
                                        onChange={handleCameraChange}
                                        className="bg-[#1a1a1f] border border-white/10 text-gray-300 text-[11px] rounded-lg px-2 py-1 outline-none hover:border-blue-500/50 transition-colors w-32 truncate"
                                    >
                                        <option value="" disabled>Select Camera</option>
                                        {videoDevices.map((device, idx) => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Camera ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {selectedDeviceId === "IP_CAMERA" && (
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        placeholder="http://192.168.1.X:8080"
                                        value={ipCameraUrl}
                                        onChange={(e) => {
                                            setIpCameraUrl(e.target.value);
                                            localStorage.setItem('ipCameraUrl', e.target.value);
                                        }}
                                        className="w-full bg-[#111114] border border-blue-500/30 text-blue-300 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            )}

                            <div className="relative flex-1 bg-black/50 rounded-2xl overflow-hidden border border-white/5 min-h-[240px]">
                                {selectedDeviceId === "IP_CAMERA" ? (
                                    <img
                                        src={isSessionActive && ipCameraUrl ? `${ipCameraUrl}/video` : undefined}
                                        className={`w-full h-full object-cover transition-opacity duration-700 ${isSessionActive ? 'opacity-100' : 'opacity-0'}`}
                                        alt="IP stream"
                                    />
                                ) : (
                                    <video
                                        ref={videoRef}
                                        autoPlay playsInline muted
                                        className={`w-full h-full object-cover transition-opacity duration-700 ${isSessionActive ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                )}

                                {!isSessionActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                                        <Power size={32} className="mb-3 opacity-30" />
                                        <p className="text-[10px] font-black tracking-widest uppercase">Start session to activate</p>
                                    </div>
                                )}
                                {isSessionActive && (
                                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-[9px] font-bold text-white/70 uppercase">Live</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 space-y-3 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(session.cv_items || {}).map(([name, qty]) => (
                                    <div key={name} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                                        <span className="text-xs font-semibold capitalize text-gray-200">{name.replace(/_/g, ' ')}</span>
                                        <div className="px-2 py-1 bg-blue-500/10 rounded-lg text-[10px] font-black text-blue-400">x{qty}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Central Panel */}
                    <div className="lg:col-span-5 space-y-6">
                        <AnimatePresence>
                            {isMismatch && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-red-600 rounded-3xl shadow-2xl border-2 border-red-400 flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0"><AlertCircle size={36} className="animate-pulse" /></div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black mb-1 uppercase italic leading-none">THEFT DETECTED!</h4>
                                        <p className="text-sm text-red-100 font-medium">Vision ₹{session.expected_total} vs Stated ₹{session.audio_total}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-[#111114] border border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center gap-10 shadow-2xl">
                            <div className="flex justify-between w-full gap-12 text-white">
                                <div className="text-center flex-1">
                                    <p className="text-gray-600 text-[10px] font-bold uppercase mb-4">Real Total</p>
                                    <p className="text-7xl font-black">₹{session.expected_total || '0'}</p>
                                </div>
                                <div className="w-[1px] bg-white/5 h-20 self-center" />
                                <div className="text-center flex-1">
                                    <p className="text-gray-600 text-[10px] font-bold uppercase mb-4">Voice Bill</p>
                                    <p className={`text-7xl font-black ${isMismatch ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ₹{session.audio_total || '0'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={isSessionActive ? stopSession : startSession}
                                className={`w-full py-6 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-4 ${isSessionActive
                                    ? 'bg-red-500 text-white shadow-2xl shadow-red-500/40 hover:bg-red-600'
                                    : 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:scale-[1.02]'
                                    }`}
                            >
                                {isSessionActive ? (
                                    <><Power size={24} className="animate-pulse" /> STOP SESSION</>
                                ) : (
                                    <><Power size={24} /> START SESSION</>
                                )}
                            </button>

                            {isSessionActive && (
                                <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                                    <span className="flex items-center gap-2 text-emerald-400"><Camera size={12} /> Camera</span>
                                    <span className="flex items-center gap-2 text-emerald-400"><Mic size={12} /> Mic</span>
                                    <span className="flex items-center gap-2 text-blue-400"><Zap size={12} /> Pipeline</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                       DUAL LOG PANEL (Right)
                    ══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
                        <section className="bg-[#111114] border border-white/5 rounded-3xl p-6 flex-1 flex flex-col">

                            {/* Tab Switcher */}
                            <div className="flex items-center gap-2 mb-4">
                                <button
                                    onClick={() => setActiveLogTab("conversation")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeLogTab === "conversation"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "text-gray-600 hover:text-gray-400"
                                        }`}
                                >
                                    <MessageSquare size={12} /> Chat
                                    {conversationLog.length > 0 && (
                                        <span className="ml-1 bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full text-[8px]">{conversationLog.length}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveLogTab("action")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeLogTab === "action"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "text-gray-600 hover:text-gray-400"
                                        }`}
                                >
                                    <Zap size={12} /> System
                                    {actionLog.length > 0 && (
                                        <span className="ml-1 bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full text-[8px]">{actionLog.length}</span>
                                    )}
                                </button>
                            </div>

                            {/* Log Content */}
                            <div className="flex-1 rounded-2xl bg-black/50 border border-white/5 p-5 font-mono text-sm leading-relaxed overflow-y-auto max-h-[400px]">

                                {/* Live transcript indicator */}
                                {isSessionActive && liveTranscript && activeLogTab === "conversation" && (
                                    <p className="text-gray-500 mb-4 border-b border-white/5 pb-3 italic text-xs">🎤 "{liveTranscript}"</p>
                                )}

                                {/* ── CONVERSATION LOG ── */}
                                {activeLogTab === "conversation" && (
                                    conversationLog.length > 0 ? (
                                        <div className="space-y-3">
                                            {conversationLog.map((entry, i) => (
                                                <div key={i} className="flex flex-col gap-0.5 border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                                                    <SpeakerBadge
                                                        role={entry.role}
                                                        displayConfidence={entry.displayConfidence}
                                                        className="text-[10px]"
                                                    />
                                                    <p className="text-xs text-gray-200 leading-snug pl-1">{entry.text}</p>
                                                </div>
                                            ))}
                                            <div ref={conversationEndRef} />
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                                            <MessageSquare size={32} />
                                            <p className="text-[9px] mt-2 uppercase">No conversation yet</p>
                                        </div>
                                    )
                                )}

                                {/* ── ACTION LOG ── */}
                                {activeLogTab === "action" && (
                                    actionLog.length > 0 ? (
                                        <div className="space-y-2">
                                            {actionLog.map((entry, i) => (
                                                <p key={i} className={`text-xs ${entry.level === "error" ? "text-red-400" :
                                                    entry.level === "warn" ? "text-amber-400" :
                                                        entry.level === "success" ? "text-emerald-400" :
                                                            "text-gray-500"
                                                    }`}>
                                                    {entry.level === "error" ? "❌" :
                                                        entry.level === "warn" ? "⚠️" :
                                                            entry.level === "success" ? "✅" : "⚙️"}{" "}
                                                    {entry.message}
                                                </p>
                                            ))}
                                            <div ref={actionEndRef} />
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                                            <Power size={32} />
                                            <p className="text-[9px] mt-2 uppercase">Start session to begin</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchingDashboard;
