import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, Mic, ShieldCheck, Zap, RefreshCw,
    CheckCircle2, AlertCircle, X, Power,
    Flame, MicOff
} from 'lucide-react';
import { startTranscription, stopTranscription } from '../services/speech.service';
import { AIResponseCard } from '../components/AIResponseCard';

const SYNC_BACKEND = "http://localhost:5000/demo";

const MatchingDashboard = () => {
    // ══════════════════════════════════════════════════════════════
    // SINGLE SESSION STATE — controls mic + camera + pipeline
    // ══════════════════════════════════════════════════════════════
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [aiResponses, setAiResponses] = useState([]); // Array of stacked AI responses

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
    const [pipelineLog, setPipelineLog] = useState([]);

    // ── Camera Selection State ──
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(localStorage.getItem('preferredCamera') || "");
    const [ipCameraUrl, setIpCameraUrl] = useState(localStorage.getItem('ipCameraUrl') || "http://192.168.1.100:8080");

    const videoRef = useRef(null);
    const recognizerRef = useRef(null);
    const sessionActiveRef = useRef(false); // Ref for async callbacks

    // Keep ref in sync with state
    useEffect(() => {
        sessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    // ── Capture frame (only if session active) ──
    const captureFrame = useCallback(() => {
        if (!sessionActiveRef.current) return { image: null, ipCameraUrl: null };

        // Handle IP Camera Frame Capture (Passed to backend)
        if (selectedDeviceId === "IP_CAMERA") {
            return { image: null, ipCameraUrl };
        }

        // Handle Local Video Frame Capture
        if (!videoRef.current) return { image: null, ipCameraUrl: null };
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (canvas.width === 0 || canvas.height === 0) return { image: null, ipCameraUrl: null };

        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);
        return { image: canvas.toDataURL("image/jpeg", 0.7), ipCameraUrl: null };
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
                // Request initial permission to get labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                tempStream.getTracks().forEach(t => t.stop()); // Stop the temp stream

                const videoInputs = devices.filter(d => d.kind === 'videoinput');

                // Inject Network Camera option
                videoInputs.push({ deviceId: "IP_CAMERA", label: "🌐 Network IP Camera" });

                setVideoDevices(videoInputs);
                console.log("[CAM] Available devices:", videoInputs.map(v => v.label).join(", "));

                // If no selected device and there are cameras, auto select the first
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

    // Hot-swap camera if session is running
    const handleCameraChange = async (e) => {
        const newDeviceId = e.target.value;
        setSelectedDeviceId(newDeviceId);
        localStorage.setItem('preferredCamera', newDeviceId);
        console.log(`[CAM] Selected: ${videoDevices.find(d => d.deviceId === newDeviceId)?.label || newDeviceId}`);

        if (isSessionActive) {
            stopCamera();
            if (newDeviceId === "IP_CAMERA") {
                setPipelineLog(prev => [...prev, "🌐 Swapped to IP Camera Network Feed"]);
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: newDeviceId ? { deviceId: { exact: newDeviceId } } : { facingMode: "environment" }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    setPipelineLog(prev => [...prev, "📷 Camera stream swapped"]);
                } catch (err) {
                    console.error("Camera Hot-swap Error:", err);
                    setPipelineLog(prev => [...prev, "❌ Camera swap failed: " + err.message]);
                }
            }
        }
    };

    // ══════════════════════════════════════════════════════════════
    // START SESSION — mic + camera + backend reset (single action)
    // ══════════════════════════════════════════════════════════════
    const startSession = async () => {
        if (isSessionActive) return; // Prevent double init

        console.log("[SESSION] Starting...");
        setPipelineLog(["🟢 Session starting..."]);
        setAlerts([]);
        setComparison(null);
        setStatus("Starting...");

        // 1. Reset backend
        try {
            await fetch(`${SYNC_BACKEND}/reset`, { method: 'POST' });
            setPipelineLog(prev => [...prev, "✅ Backend reset"]);
        } catch (err) {
            setPipelineLog(prev => [...prev, "❌ Backend reset failed"]);
        }

        // 2. Start camera
        try {
            if (selectedDeviceId === "IP_CAMERA") {
                if (!ipCameraUrl) {
                    setPipelineLog(prev => [...prev, "❌ IP Camera URL is missing!"]);
                    setStatus("Error");
                    return;
                }
                setPipelineLog(prev => [...prev, "🌐 Connected to IP Camera stream"]);
            } else {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: "environment" }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setPipelineLog(prev => [...prev, "📷 Local Camera active"]);
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setPipelineLog(prev => [...prev, "❌ Camera failed: " + err.message]);
            setStatus("Error");
            return; // Abort if camera fails
        }

        try {
            const recognizer = startTranscription(async (text, isFinal) => {
                console.log(`[FRONTEND-PIPELINE] 🎤 Speech event received: "${text}" (isFinal: ${isFinal})`);

                // ── Pipeline guard: ignore if session stopped ──
                if (!sessionActiveRef.current) {
                    console.log("[FRONTEND-PIPELINE] ⚠️ Dropped transcript because sessionActiveRef is false");
                    return;
                }

                // ── Guard: Ignore completely empty text (e.g. 15s silence timeouts) ──
                if (!text || text.trim() === "") {
                    console.warn("[FRONTEND-PIPELINE] ⚠️ Dropped empty transcript (Common during mic silence).");
                    return;
                }

                setLiveTranscript(text);
                if (!isFinal) return;

                const raw = text.toLowerCase();
                const isTotal = raw.includes("total") || raw.includes("bill") || raw.includes("hisab");

                if (isTotal) {
                    setStatus("Processing...");
                    setPipelineLog(prev => [...prev, "⚡ 'Total' → pipeline firing..."]);
                    console.log(`[FRONTEND-PIPELINE] 🎯 "Total" keyword matched! Assembling payload...`);
                }

                // Build payload — attach frame or IP URL on "total"
                const payload = { transcript: text };
                if (isTotal) {
                    const frameData = captureFrame();
                    if (frameData.image) {
                        payload.image = frameData.image;
                        setPipelineLog(prev => [...prev, "📸 Local frame captured"]);
                        console.log(`[FRONTEND-PIPELINE] 📸 Appended local frame to payload (${Math.round(frameData.image.length / 1024)}KB)`);
                    } else if (frameData.ipCameraUrl) {
                        payload.ipCameraUrl = frameData.ipCameraUrl;
                        setPipelineLog(prev => [...prev, "🌐 Routed Network snapshot trigger"]);
                        console.log(`[FRONTEND-PIPELINE] 🌐 Appended IP Camera URL to payload.`);
                    } else {
                        setPipelineLog(prev => [...prev, "⚠️ Frame capture failed"]);
                        console.log(`[FRONTEND-PIPELINE] ⚠️ Both local and IP frame capture returned null.`);
                    }
                }

                console.log(`[FRONTEND-PIPELINE] 🚀 Dispatching POST to ${SYNC_BACKEND}/voice-orchestrator`);
                try {
                    const res = await fetch(`${SYNC_BACKEND}/voice-orchestrator`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        console.error(`[FRONTEND-PIPELINE] ❌ Backend returned HTTP ${res.status}`);
                    }

                    const data = await res.json();
                    console.log(`[FRONTEND-PIPELINE] 📥 Backend responded:`, data);

                    // ── Handle responses ──
                    handlePipelineResponse(data);
                    fetchSession();
                } catch (err) {
                    console.error("[FRONTEND-PIPELINE] ❌ Fetch Error:", err);
                    setPipelineLog(prev => [...prev, "❌ Network Error communicating with backend"]);
                }
            });
            recognizerRef.current = recognizer;
            setPipelineLog(prev => [...prev, "🎤 Microphone active"]);
        } catch (err) {
            console.error("Mic Error:", err);
            setPipelineLog(prev => [...prev, "❌ Mic failed: " + err.message]);
            // Stop camera if mic fails
            stopCamera();
            setStatus("Error");
            return;
        }

        // 4. All good
        setIsSessionActive(true);
        setStatus("Active");
        setLiveTranscript("");
        setPipelineLog(prev => [...prev, "═══════════════════════", "✅ SESSION ACTIVE — speak to bill items", "═══════════════════════"]);
    };

    // ══════════════════════════════════════════════════════════════
    // STOP SESSION — cleanup everything
    // ══════════════════════════════════════════════════════════════
    const stopSession = async () => {
        if (!isSessionActive) return;

        console.log("[SESSION] Stopping...");
        setIsSessionActive(false);

        // 1. Stop mic
        if (recognizerRef.current) {
            stopTranscription(recognizerRef.current);
            recognizerRef.current = null;
        }

        // 2. Stop camera
        stopCamera();

        // 3. Reset backend
        try {
            await fetch(`${SYNC_BACKEND}/reset`, { method: 'POST' });
        } catch (err) { /* ignore */ }

        // 4. Clear UI
        setStatus("Idle");
        setLiveTranscript("");
        setSession({ cv_items: {}, audio_items: {}, audio_total: null, expected_total: null, alerts: [] });
        setComparison(null);
        setAlerts([]);
        setPipelineLog(["⏹️ Session stopped. All resources released."]);
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    };

    // ── Handle all pipeline responses in one place ──
    const handlePipelineResponse = (data) => {
        console.log(`[PIPELINE] Handling response payload:`, data);

        if (data.type === "ai_response") {
            // Anti-spam: prevent duplicate messages within 3s
            setAiResponses(prev => {
                const now = Date.now();
                const isDuplicate = prev.some(r => r.message === data.message && (now - r.timestamp) < 3000);
                if (isDuplicate) return prev;
                // Add new response at the top
                return [{ ...data, timestamp: now }, ...prev];
            });
            setPipelineLog(prev => [...prev, `🤖 AI (${data.category}): ${data.message}`]);
            setStatus("Active");
            return;
        }

        if (data.status === "ok" || data.status === "mismatch" || data.status === "partial") {
            setComparison(data);
            setStatus(data.status === "ok" ? "✓ Verified" : data.status === "mismatch" ? "⚠ Mismatch" : "Partial");
            if (data.session) setSession(data.session);

            const logs = [
                `🗣️ Audio: ${Object.entries(data.audio_items || {}).map(([k, v]) => `${k} x${v}`).join(", ") || "none"}`,
                `👁️ CV (${data.cv_source}): ${Object.entries(data.items_detected || {}).map(([k, v]) => `${k} x${v}`).join(", ")}`,
                `💰 Expected: ₹${data.expected_total}  |  Stated: ₹${data.audio_total}`,
                `📋 ${data.status.toUpperCase()} (Δ ₹${data.difference?.toFixed(2) || 0})`
            ];
            if (data.missing_items?.length > 0) logs.push(`🔴 Unbilled: ${data.missing_items.map(i => `${i.product}(x${i.cv_qty})`).join(", ")}`);
            if (data.extra_items?.length > 0) logs.push(`🟡 Extra: ${data.extra_items.map(i => `${i.product}(x${i.audio_qty})`).join(", ")}`);
            setPipelineLog(prev => [...prev, ...logs]);

            if (data.status === "mismatch") {
                const unbilled = data.missing_items?.map(i => i.product).join(", ");
                setAlerts(prev => [{
                    type: 'mismatch',
                    message: `Vision ₹${data.expected_total} vs Stated ₹${data.audio_total}${unbilled ? ` | Unbilled: ${unbilled}` : ""}`
                }, ...prev]);
            }

        } else if (data.status === "no_items") {
            setStatus("No Items");
            setPipelineLog(prev => [...prev, "⛔ No CV items detected. Retrying..."]);

        } else if (data.status === "no_image") {
            setStatus("No Camera");
            setPipelineLog(prev => [...prev, "📷 No frame captured — camera issue"]);

        } else if (data.status === "accumulating") {
            setStatus("Active");
            const items = data.parsed?.items ? Object.entries(data.parsed.items).map(([k, v]) => `${k} x${v}`).join(", ") : "none";
            setPipelineLog(prev => [...prev, `📝 Intent Logged: ${data.message}`]);

        } else if (data.status === "reset_done") {
            setSession(data.session || { cv_items: {}, audio_items: {}, audio_total: null, expected_total: null, alerts: [] });
            setStatus("Active");
            setComparison(null);
            setAlerts([]);
            setPipelineLog(prev => [...prev, "🔄 Reset. Ready for next."]);
            setLiveTranscript("");

        } else if (data.status === "busy") {
            console.warn("[PIPELINE] Backend is busy.");
            setPipelineLog(prev => [...prev, "⚠️ Backend Busy: Processing previous command."]);

        } else if (data.error) {
            console.error("[PIPELINE] Backend Error:", data.error);
            setPipelineLog(prev => [...prev, `❌ Error: ${data.error}`]);
        } else {
            console.warn("[PIPELINE] Unhandled Event Response:", data);
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
                        {/* Status Badge */}
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

                                {/* ── Camera Selector ── */}
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

                            {/* ── Optional IP Url Input ── */}
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

                        {/* Mismatch Alarm */}
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

                        {/* Totals */}
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

                            {/* ═══ THE SINGLE BUTTON ═══ */}
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

                            {/* Active indicators */}
                            {isSessionActive && (
                                <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                                    <span className="flex items-center gap-2 text-emerald-400"><Camera size={12} /> Camera</span>
                                    <span className="flex items-center gap-2 text-emerald-400"><Mic size={12} /> Mic</span>
                                    <span className="flex items-center gap-2 text-blue-400"><Zap size={12} /> Pipeline</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pipeline Log (Right) */}
                    <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
                        <section className="bg-[#111114] border border-white/5 rounded-3xl p-6 flex-1 flex flex-col">
                            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Zap size={14} className="text-blue-400" /> Pipeline Log
                            </h3>
                            <div className="flex-1 rounded-2xl bg-black/50 border border-white/5 p-5 font-mono text-sm leading-relaxed overflow-y-auto max-h-[400px]">
                                {isSessionActive && liveTranscript && (
                                    <p className="text-gray-300 mb-4 border-b border-white/5 pb-3">🎤 "{liveTranscript}"</p>
                                )}
                                {pipelineLog.length > 0 ? (
                                    <div className="space-y-2">
                                        {pipelineLog.map((log, i) => (
                                            <p key={i} className={`text-xs ${log.includes("═") ? "text-blue-500 font-bold" : log.includes("❌") || log.includes("🔴") ? "text-red-400" : "text-gray-400"}`}>{log}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                                        <Power size={32} />
                                        <p className="text-[9px] mt-2 uppercase">Start session to begin</p>
                                    </div>
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
