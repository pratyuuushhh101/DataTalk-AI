import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import KpiCards from '../components/KpiCards';
import ChartSection from '../components/ChartSection';
import { runQuery } from '../services/api';

const ProfitAnalysisPage = () => {
    const [hasDataset, setHasDataset] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const uploaded = sessionStorage.getItem('datasetUploaded');
        if (uploaded === 'true') {
            setHasDataset(true);
            fetchProfitData();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchProfitData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Updated safer query per corrected strategy plan
            const response = await runQuery("Show revenue trends over time");
            setData(response);
        } catch (err) {
            setError(err.message || 'Failed to analyze profit trends.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasDataset) {
        return (
            <div className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex-1 bg-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-card-border flex items-center justify-center p-12 min-h-[500px]">
                    <div className="text-center max-w-sm animate-fade-in">
                        <div className="w-20 h-20 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float">
                            <TrendingUp className="w-10 h-10 text-accent/60" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-100 mb-2">
                            Welcome to DataTalk AI
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Upload a dataset to begin analyzing your business data.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 animate-fade-in-up">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <TrendingUp className="text-accent w-8 h-8" />
                            Profit Analysis
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Deep dive into revenue momentum and business growth metrics.</p>
                    </div>
                    <button
                        onClick={fetchProfitData}
                        disabled={isLoading}
                        className="p-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition-colors flex items-center gap-2 group"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-400 group-hover:text-accent transition-colors ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline font-medium text-sm">Refresh Data</span>
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/20 flex items-start space-x-3 animate-fade-in">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-red-300">Analysis Error</h3>
                            <p className="mt-0.5 text-sm text-red-400">{error}</p>
                        </div>
                    </div>
                )}

                {/* Content Section */}
                {isLoading ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI Skeletons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-5 h-[120px] flex flex-col justify-between overflow-hidden relative">
                                    <div className="skeleton h-4 w-24 mb-4" />
                                    <div className="skeleton h-8 w-32" />
                                </div>
                            ))}
                        </div>
                        {/* Chart Skeleton */}
                        <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-6 mt-6 h-[400px]">
                            <div className="skeleton h-4 w-40 mb-8" />
                            <div className="flex items-end justify-between h-[250px] space-x-2">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="skeleton w-full rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    data && (
                        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                            {/* We expect runQuery to return { data: [], insight: "..." } */}
                            {data.data && data.data.length > 0 ? (
                                <>
                                    <KpiCards data={data.data} />
                                    <ChartSection data={data.data} />
                                </>
                            ) : (
                                <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-12 text-center min-h-[300px] flex flex-col justify-center items-center">
                                    <TrendingUp className="w-12 h-12 text-gray-600 mb-4" />
                                    <h3 className="text-lg font-bold text-gray-300 mb-2">Insufficient Data</h3>
                                    <p className="text-sm text-gray-500">Not enough revenue data found in the dataset to generate a profit analysis.</p>
                                </div>
                            )}
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default ProfitAnalysisPage;
