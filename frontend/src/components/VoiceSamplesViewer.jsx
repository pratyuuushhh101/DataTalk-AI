import React, { useMemo } from 'react';
import { Mic, Play, Clock, Volume2 } from 'lucide-react';

/**
 * VoiceSamplesViewer — displays recorded voice enrollment samples
 * with playback controls and metadata after successful enrollment.
 *
 * @param {Object} props
 * @param {Array<{blob: Blob, duration: number}>} props.samples - array of recorded samples
 */
export function VoiceSamplesViewer({ samples = [] }) {
    // Create stable object URLs (memoized to prevent re-creation on re-renders)
    const sampleUrls = useMemo(() => {
        return samples.map(sample => ({
            url: URL.createObjectURL(sample.blob),
            duration: sample.duration,
            size: sample.blob.size,
            type: sample.blob.type
        }));
    }, [samples]);

    if (samples.length === 0) return null;

    return (
        <div className="w-full max-w-md mx-auto mt-6">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Mic className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                    Your Recorded Samples
                </h3>
                <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {samples.length} / 5
                </span>
            </div>

            {/* Samples List */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {sampleUrls.map((sample, index) => (
                    <div
                        key={index}
                        className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                        {/* Sample Header Row */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-blue-100 text-blue-600' :
                                        index === 1 ? 'bg-emerald-100 text-emerald-600' :
                                            index === 2 ? 'bg-violet-100 text-violet-600' :
                                                index === 3 ? 'bg-amber-100 text-amber-600' :
                                                    'bg-rose-100 text-rose-600'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm font-semibold text-gray-800">
                                    Sample {index + 1}
                                </span>
                            </div>

                            {/* Metadata badges */}
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" />
                                    {sample.duration.toFixed(1)}s
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                    {(sample.size / 1024).toFixed(0)}KB
                                </span>
                            </div>
                        </div>

                        {/* Audio Player */}
                        <audio
                            controls
                            src={sample.url}
                            className="w-full h-8 rounded-lg"
                            preload="metadata"
                        />
                    </div>
                ))}
            </div>

            {/* Footer info */}
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                <Volume2 className="w-3 h-3" />
                <span>Audio stored locally in browser memory only. Not uploaded to server.</span>
            </div>
        </div>
    );
}

export default VoiceSamplesViewer;
