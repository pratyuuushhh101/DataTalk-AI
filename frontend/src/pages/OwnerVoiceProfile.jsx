import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, PlayCircle, Loader2, Music, UserCheck, AlertTriangle } from 'lucide-react';

const NODE_BACKEND_URL = import.meta.env.VITE_NODE_BACKEND_URL || "http://localhost:5000";

const OwnerVoiceProfile = () => {
    const shopId = "shop_112"; // Standard shop fallback
    const [samples, setSamples] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSamples = async () => {
            try {
                const res = await axios.get(`${NODE_BACKEND_URL}/speaker/owner-samples/${shopId}`);
                if (res.data && res.data.samples) {
                    setSamples(res.data.samples);
                }
            } catch (err) {
                console.error("Failed to load owner voice samples:", err);
                setError("Could not retrieve voice samples. Backend connection failed.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSamples();
    }, [shopId]);

    const handleClearProfile = async () => {
        try {
            // Optional: call backend reset/clear API. For now, UI fallback message
            alert("Clearing functionality needs backend API extension! (User requested optional).");
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-emerald-700 font-medium">Loading voice profile...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl m-8">
                <div className="flex items-center space-x-3 text-red-600 mb-2">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="font-bold">Error</h3>
                </div>
                <p className="text-red-600/80">{error}</p>
            </div>
        );
    }

    if (!samples.length) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">No Voice Profile Found</h2>
                <p className="text-gray-500 max-w-sm">
                    You have not enrolled your voice yet or your session was cleared.
                </p>
                <button
                    onClick={() => window.location.href = "/founder"}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-medium hover:bg-emerald-700 transition-colors"
                >
                    Enroll Owner Voice
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <UserCheck className="w-8 h-8 text-emerald-500" />
                        Owner Voice Profile
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Your authenticated voice signature is securely locked to {shopId}.
                    </p>
                </div>
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold flex items-center shadow-sm">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Protected
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {samples.map((sample, index) => (
                    <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-60" />

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <PlayCircle className="w-5 h-5 text-emerald-600" />
                                    Sample {index + 1}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Created details at {new Date(sample.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold rounded-full">
                                {(sample.duration).toFixed(1)}s
                            </span>
                        </div>

                        <div className="relative z-10 w-full rounded-xl bg-gray-50 p-2 border border-gray-100">
                            <audio
                                controls
                                className="w-full h-10 outline-none"
                                src={`${NODE_BACKEND_URL}/speaker/sample/${sample.fileName}`}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-8 border-t border-gray-100 flex justify-end">
                <button
                    onClick={handleClearProfile}
                    className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium rounded-xl border border-red-200 flex items-center gap-2"
                >
                    <AlertTriangle className="w-4 h-4" />
                    Re-record / Drop Profile
                </button>
            </div>
        </div>
    );
};

export default OwnerVoiceProfile;
