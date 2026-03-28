import React, { useState } from 'react';
import axios from 'axios';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Mic, Square, RefreshCcw, CheckCircle, AlertCircle, ChevronRight, UploadCloud, RotateCcw, ShieldCheck } from 'lucide-react';
import { VoiceSamplesViewer } from './VoiceSamplesViewer';

const ENROLLMENT_PHRASES = [
    "Aaj ka total pachaas rupaye hai aur do packet chips dene hain",
    "Bhaiya ek Pepsi aur do Lays dena, total kitna hua batao",
    "Yeh item abhi stock mein nahi hai, kal subah tak aa jayega",
    "Customer ko bolo ki dus rupaye ka discount milega agar do item lega",
    "Aaj ka pura hisaab likh lo aur kal ke liye stock check kar lena"
];

const NODE_BACKEND_URL = "http://localhost:5000";
const PYTHON_BACKEND_URL = "http://localhost:8100";

export function OwnerVoiceEnrollment({ shopId = "shop_112", onComplete }) {
    // strict state machines
    const [currentIndex, setCurrentIndex] = useState(0);
    const [samples, setSamples] = useState([]); // Array of { blob, duration }

    // UI flow control
    const [state, setState] = useState("idle"); // idle, recording, recorded
    const [validationError, setValidationError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enrollError, setEnrollError] = useState('');
    const [enrollSuccess, setEnrollSuccess] = useState(false);

    const {
        startRecording,
        stopRecording,
        resetRecording,
        isRecording,
        audioBlob,
        duration,
        error: micError,
        validateRecording
    } = useAudioRecorder();

    // Ensure the custom hook syncs with our strict state
    if (isRecording && state !== "recording") {
        setState("recording");
    } else if (!isRecording && audioBlob && state === "recording") {
        setState("recorded");
    }

    // ── Flow Handlers ───────────────────────────────────────────────────────

    // Auto-stop recording at 6s boundary
    React.useEffect(() => {
        if (state === "recording" && duration >= 6.0) {
            handleStopRecording();
        }
    }, [duration, state]);

    const handleStartRecording = () => {
        setValidationError('');
        resetRecording(); // ENFORCE fresh buffer per phrase
        startRecording();
        setState("recording");
    };

    const handleStopRecording = () => {
        stopRecording();
        setState("recorded");
    };

    const handleRerecord = () => {
        setValidationError('');
        resetRecording(); // DO NOT reuse buffer 
        startRecording();
        setState("recording");
    };

    const handleLooksGood = () => {
        if (duration < 3.0) {
            setValidationError("Please speak for at least 3 seconds");
            return;
        }

        const validCheck = validateRecording();
        if (!validCheck.valid) {
            setValidationError(validCheck.reason);
            return;
        }

        // Push sample with metadata
        setSamples(prev => [...prev, { blob: audioBlob, duration: duration }]);
        setValidationError('');

        // Clear previous blob & reset UI state machine
        resetRecording();
        setState("idle");

        // Move to next prompt
        setCurrentIndex(prev => prev + 1);
    };

    const handleStartOver = () => {
        setSamples([]);
        setCurrentIndex(0);
        resetRecording();
        setState("idle");
        setValidationError('');
        setEnrollError('');
        setIsSubmitting(false);
        setEnrollSuccess(false);
    };

    const handleFinalizeProfile = async () => {
        if (samples.length < 3) {
            setEnrollError("Minimum 3 voice samples required");
            return;
        }
        setIsSubmitting(true);
        setEnrollError('');

        try {
            const embeddings = [];

            // Step 1: Extract individual Embeddings from the Python microservice
            for (let i = 0; i < samples.length; i++) {
                const { blob } = samples[i];

                // Validate blob before upload
                if (!blob || blob.size === 0) {
                    console.error(`[Enrollment] Sample ${i + 1} is empty, skipping`);
                    continue;
                }

                console.log(`[Enrollment] Uploading sample ${i + 1}/${samples.length}: type=${blob.type}, size=${blob.size} bytes`);

                const formData = new FormData();
                formData.append('file', blob, `sample_${i}_${Date.now()}.webm`);

                const extractRes = await axios.post(`${PYTHON_BACKEND_URL}/extract-embedding`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (extractRes.data && extractRes.data.vector) {
                    console.log(`[Enrollment] Sample ${i + 1} embedding extracted (${extractRes.data.vector.length} dims)`);
                    embeddings.push(extractRes.data.vector);
                } else {
                    console.warn(`[Enrollment] Sample ${i + 1} rejected: ${extractRes.data?.error}`);
                }
            }

            if (embeddings.length < 3) {
                throw new Error("Extracted less than 3 valid embeddings due to noise rejection. Please restart.");
            }

            // Step 2: Final Enrollment
            const enrollData = new FormData();
            enrollData.append('shopId', shopId);
            enrollData.append('embeddings', JSON.stringify(embeddings));
            enrollData.append('sampleCount', samples.length);
            enrollData.append('durations', JSON.stringify(samples.map(s => s.duration)));

            samples.forEach((s, idx) => {
                enrollData.append('samples', s.blob, `sample_${idx}.webm`);
            });

            const enrollRes = await axios.post(`${NODE_BACKEND_URL}/speaker/enroll-owner`, enrollData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (enrollRes.data.success) {
                setEnrollSuccess(true);
                if (onComplete) {
                    setTimeout(onComplete, 1000);
                } else {
                    setTimeout(() => window.location.href = "/owner-voice-profile", 1500);
                }
            }
        } catch (err) {
            setEnrollError(err.response?.data?.error || err.message || "Failed to finalize owner profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render: Enrolled Success State ──────────────────────────────────────
    if (enrollSuccess) {
        return (
            <div className="w-full max-w-md mx-auto space-y-6">
                {/* Success Banner */}
                <div className="p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl flex flex-col items-center text-center shadow-sm">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-800">Voice Profile Created!</h2>
                    <p className="text-sm text-emerald-600 mt-2 max-w-xs">
                        {samples.length} voice samples enrolled. The system will now identify you as the shop owner.
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Ready for real-time matching</span>
                    </div>
                </div>

                {/* Voice Samples Viewer */}
                <VoiceSamplesViewer samples={samples} />

                {/* Re-enroll Button */}
                <button
                    onClick={handleStartOver}
                    className="w-full max-w-md mx-auto mt-4 bg-white hover:bg-red-50 text-red-500 border border-red-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm"
                >
                    <RotateCcw className="w-4 h-4" /> Re-enroll Voice Profile
                </button>
            </div>
        );
    }

    // ── Render: Finalization Page ───────────────────────────────────────────
    if (currentIndex >= 5 || (samples.length >= 3 && currentIndex > samples.length && state === "idle")) {
        return (
            <div className="w-full max-w-md mx-auto bg-white shadow-xl border border-gray-100 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Ready to Enroll</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Captured {samples.length} valid voice samples seamlessly.
                </p>

                {/* Preview of captured samples */}
                <div className="mt-4 space-y-2">
                    {samples.map((sample, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-md flex items-center justify-center">
                                    {i + 1}
                                </div>
                                <span className="text-sm text-gray-600">Sample {i + 1}</span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{sample.duration.toFixed(1)}s</span>
                        </div>
                    ))}
                </div>

                {enrollError && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 border border-red-200 text-sm rounded-lg flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{enrollError}</span>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex gap-3">
                    {samples.length < 5 && (
                        <button
                            onClick={() => setCurrentIndex(samples.length)}
                            disabled={isSubmitting}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 flex-1 rounded-xl transition-all"
                        >
                            Add More
                        </button>
                    )}
                    <button
                        onClick={handleFinalizeProfile}
                        disabled={isSubmitting || samples.length < 3}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 flex-[2] rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Uploading...' : 'Finalize Profile'} <UploadCloud className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={handleStartOver}
                    disabled={isSubmitting}
                    className="w-full mt-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                >
                    <RotateCcw className="w-4 h-4" /> Restart Enrollment
                </button>
            </div>
        );
    }

    // ── Render: Recording Step ──────────────────────────────────────────────
    const promptText = ENROLLMENT_PHRASES[currentIndex];

    return (
        <div className="w-full max-w-md mx-auto bg-white shadow-xl border border-gray-100 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                    Sample {currentIndex + 1} of {samples.length >= 3 ? '5 (Optional)' : '3'}
                </span>
                <span className={`text-sm font-mono ${duration < 3 ? 'text-orange-500' : 'text-emerald-500'}`}>
                    Recording: {duration.toFixed(1)}s / 6.0s
                </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center shadow-inner min-h-[120px] flex items-center justify-center flex-col gap-3 mt-2">
                <h3 className="text-xl font-bold text-black !text-black leading-snug">"{promptText}"</h3>
            </div>

            <div className="text-center mt-3 text-sm text-gray-500 font-medium">
                Speak clearly and naturally for 3–6 seconds.<br />
                Do not rush or speak only numbers.
            </div>

            {validationError && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 animate-pulse">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {validationError}
                </div>
            )}

            {micError && <div className="mt-4 p-3 text-red-500 bg-red-50 text-sm italic rounded-lg">{micError}</div>}

            <div className="mt-8 flex flex-col gap-3">
                {state === "idle" && (
                    <button
                        onClick={handleStartRecording}
                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 group transition-all"
                    >
                        <Mic className="w-5 h-5 group-hover:scale-110 transition-transform text-red-400" /> Start Recording
                    </button>
                )}

                {state === "recording" && (
                    <button
                        onClick={handleStopRecording}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                    >
                        <Square className="w-5 h-5" fill="currentColor" /> Stop Recording
                    </button>
                )}

                {state === "recorded" && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <button
                            onClick={handleRerecord}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl flex-1 flex items-center justify-center gap-2 font-medium transition-all"
                        >
                            <RefreshCcw className="w-4 h-4" /> Retry
                        </button>
                        <button
                            onClick={handleLooksGood}
                            disabled={duration < 3.0}
                            className={`py-3 rounded-xl flex-[2] flex items-center justify-center gap-2 font-medium transition-all shadow-md ${duration < 3.0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
                        >
                            Looks Good <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Skip for optional samples */}
            {currentIndex >= 3 && state === "idle" && (
                <button
                    onClick={() => setCurrentIndex(5)}
                    className="w-full mt-4 text-gray-400 font-medium hover:text-gray-600 text-sm tracking-wide"
                >
                    Skip Optional Samples →
                </button>
            )}

            {/* Global Escape Hatch */}
            {currentIndex > 0 && state === "idle" && (
                <button
                    onClick={handleStartOver}
                    className="w-full mt-6 flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-500 font-medium tracking-wide uppercase"
                >
                    <RotateCcw className="w-3 h-3" /> Start Over
                </button>
            )}
        </div>
    );
}
