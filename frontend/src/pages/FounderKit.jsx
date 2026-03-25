import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Mic, ShieldCheck, Zap, RefreshCw,
    CheckCircle2, Info, MicOff, X,
    ArrowUpRight, Flame, BarChart3, TrendingUp,
    Store, Calculator, ClipboardList
} from 'lucide-react';
import { startTranscription, stopTranscription } from '../services/speech.service';

const SYNC_BACKEND = "http://localhost:5000/demo";

const FounderKit = () => {
    const [status, setStatus] = useState("Ready");
    const [alerts, setAlerts] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const recognizerRef = useRef(null);

    const toggleListening = () => {
        if (isListening) {
            stopTranscription(recognizerRef.current);
            setIsListening(false);
        } else {
            setIsListening(true);
            const recognizer = startTranscription(async (text, isFinal) => {
                setLiveTranscript(text);
                if (isFinal) {
                    const res = await fetch(`${SYNC_BACKEND}/audio`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transcript: text })
                    });
                    const data = await res.json();

                    // Always log to alerts for feedback
                    if (data.status === "founder_mode_active") {
                        setAlerts(prev => [{ type: 'founder', message: data.message }, ...prev]);
                        setStatus("Planning...");
                    } else if (data.status === "inventory_sent") {
                        setAlerts(prev => [{ type: 'success', message: data.message }, ...prev]);
                        setStatus("Ready");
                    } else if (data.message) {
                        // Generic feedback for non-scene intents
                        setAlerts(prev => [{ type: 'info', message: `AI Insight: ${data.message}` }, ...prev]);
                    }
                }
            });
            recognizerRef.current = recognizer;
        }
    };

    const removeAlert = (index) => {
        setAlerts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-10 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto flex flex-col gap-10 relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Target className="text-blue-400 w-6 h-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Founder <span className="text-blue-400">Kit</span></h1>
                        </div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest italic">Predictive Retail Strategy & Analysis</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Founder Intelligence Hub */}
                    <div className="space-y-6">
                        <section className="bg-[#111114] border border-white/5 rounded-3xl p-8 h-full flex flex-col justify-center items-center gap-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Store size={120} /></div>

                            <div className="text-center space-y-3 relative z-10">
                                <h3 className="text-2xl font-black italic">HAVE A BUSINESS IDEA?</h3>
                                <p className="text-gray-400 text-sm">Say "Naya dukaan kholna hai" to start planning.</p>
                            </div>

                            <button
                                onClick={toggleListening}
                                className={`w-full max-w-xs py-10 rounded-3xl font-black text-xl transition-all flex flex-col items-center justify-center gap-4 shadow-2xl ${isListening ? 'bg-red-500 text-white shadow-red-500/30 ring-4 ring-red-500/20' : 'bg-blue-600 text-white shadow-blue-600/30'}`}
                            >
                                {isListening ? (
                                    <>
                                        <MicOff size={44} className="animate-pulse" />
                                        <span>LISTENING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Mic size={44} />
                                        <span>START ADVICE</span>
                                    </>
                                )}
                            </button>

                            <div className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-5 overflow-hidden flex items-center justify-center">
                                <p className="text-sm font-mono text-gray-400 text-center uppercase tracking-tighter italic">
                                    {liveTranscript || (isListening ? "Say something..." : "Intelligence Standby")}
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Planning results & Alerts */}
                    <div className="space-y-6">
                        <section className="bg-[#111114] border border-white/5 rounded-3xl p-8 flex-1 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardList size={14} className="text-blue-400" /> Active Strategy
                                </h3>
                                <div className={`px-4 py-1 rounded-full text-[9px] font-black border transition-all ${status === "Planning..." ? "bg-blue-500/20 border-blue-500/30 text-blue-400 animate-pulse" : "bg-white/5 border-white/10 text-gray-500"}`}>
                                    {status.toUpperCase()}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                <AnimatePresence>
                                    {alerts.length === 0 ? (
                                        <div className="h-40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-700">
                                            <Calculator size={32} className="mb-2" />
                                            <p className="text-[10px] uppercase font-bold tracking-widest">No active strategy</p>
                                        </div>
                                    ) : alerts.map((alert, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={`p-5 rounded-2xl border flex items-center gap-5 transition-all shadow-xl ${alert.type === 'founder' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' :
                                                alert.type === 'success' ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' :
                                                    'bg-white/5 border-white/10 text-gray-400'
                                                }`}
                                        >
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-current/10 shrink-0">
                                                {alert.type === 'founder' ? <Target size={24} /> : alert.type === 'success' ? <CheckCircle2 size={24} /> : <Info size={24} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold uppercase mb-1">{alert.type === 'founder' ? 'AI Assessment' : alert.type === 'success' ? 'Plan Delivered' : 'AI Analysis'}</p>
                                                <p className="text-sm font-medium leading-snug">{alert.message}</p>
                                            </div>
                                            <button onClick={() => removeAlert(idx)}><X size={16} /></button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Decorative Stats */}
                <div className="grid grid-cols-3 gap-6 opacity-30">
                    <div className="p-6 bg-white/2 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <BarChart3 size={20} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Market Risk</p>
                        <p className="text-xl font-black text-center">LOW</p>
                    </div>
                    <div className="p-6 bg-white/2 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <TrendingUp size={20} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Area Demand</p>
                        <p className="text-xl font-black text-center">HIGH</p>
                    </div>
                    <div className="p-6 bg-white/2 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <ArrowUpRight size={20} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">ROI Forecast</p>
                        <p className="text-xl font-black text-center">24%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FounderKit;
