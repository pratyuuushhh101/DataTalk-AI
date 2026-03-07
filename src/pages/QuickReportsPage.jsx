import React, { useState, useEffect } from 'react';
import { Zap, Loader, AlertCircle, Sparkles, TrendingUp, Map, Package } from 'lucide-react';
import ChartSection from '../components/ChartSection';
import InsightSummary from '../components/InsightSummary';
import { runQuery } from '../services/api';

const QuickReportsPage = ({ language }) => {
    const [hasDataset, setHasDataset] = useState(false);
    const [state, setState] = useState({
        loading: false,
        data: [],
        insight: "",
        error: null,
        activeReport: null
    });

    useEffect(() => {
        const uploaded = sessionStorage.getItem('datasetUploaded');
        if (uploaded === 'true') {
            setHasDataset(true);
        }
    }, []);

    const handleReportClick = async (promptText) => {
        setState(prev => ({
            ...prev,
            loading: true,
            error: null,
            data: [],
            insight: "",
            activeReport: promptText
        }));

        try {
            const response = await runQuery(promptText, language);
            setState(prev => ({
                ...prev,
                loading: false,
                data: response.data || [],
                insight: response.insight || "",
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message,
                data: []
            }));
        }
    };

    if (!hasDataset) {
        return (
            <div className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex-1 bg-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-card-border flex items-center justify-center p-12 min-h-[500px]">
                    <div className="text-center max-w-sm animate-fade-in">
                        <div className="w-20 h-20 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float">
                            <Zap className="w-10 h-10 text-accent/60" />
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

    const reports = [
        {
            title: "Top Selling Products",
            prompt: "Top Selling Products",
            icon: <Package className="w-6 h-6 text-[#00CCCC]" />,
            desc: "Discover which items drive the most revenue based on historical data.",
            bg: "hover:bg-[#00CCCC]/5",
            border: "hover:border-[#00CCCC]/30"
        },
        {
            title: "Revenue by Region",
            prompt: "Revenue Breakdown by Region",
            icon: <Map className="w-6 h-6 text-[#F59E0B]" />,
            desc: "Geographical breakdown of sales performance across different operating zones.",
            bg: "hover:bg-[#F59E0B]/5",
            border: "hover:border-[#F59E0B]/30"
        },
        {
            title: "Monthly Revenue Trend",
            prompt: "Monthly Revenue Trend",
            icon: <TrendingUp className="w-6 h-6 text-[#B5FF7D]" />,
            desc: "Time-series analysis of income tracking upward and downward momentum.",
            bg: "hover:bg-[#B5FF7D]/5",
            border: "hover:border-[#B5FF7D]/30"
        }
    ];

    const hasResults = state.data && state.data.length > 0;

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="mb-8 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Zap className="text-accent w-8 h-8" />
                        Quick Reports
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Generate AI insights instantly without writing queries.</p>
                </div>

                {/* Report Prompt Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {reports.map((report, idx) => {
                        const isGenerating = state.loading && state.activeReport === report.prompt;

                        return (
                            <div
                                key={idx}
                                onClick={() => !state.loading && handleReportClick(report.prompt)}
                                className={`relative overflow-hidden bg-[#1a1a1c] border border-white/5 rounded-2xl p-6 cursor-pointer transition-all duration-300 group
                                    ${state.loading && !isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                                    ${isGenerating ? 'border-accent/40 shadow-[0_0_20px_rgba(181,255,125,0.1)]' : report.border}
                                    ${report.bg}
                                `}
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-transform ${!state.loading && 'group-hover:scale-110'}`}>
                                        {isGenerating ? <Loader className="w-6 h-6 text-accent animate-spin" /> : report.icon}
                                    </div>
                                    <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Run AI</span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-200 mb-2 relative z-10">{report.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed mb-4 relative z-10">{report.desc}</p>

                                {isGenerating && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-accent to-[#00CCCC] w-full animate-pulse-ring" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Error Banner */}
                {state.error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/20 flex items-start space-x-3 animate-fade-in-up">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-red-300">Error generating report</h3>
                            <p className="mt-0.5 text-sm text-red-400">{state.error}</p>
                        </div>
                    </div>
                )}

                {/* Results Section */}
                <div className="space-y-6">
                    {state.loading ? (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-6">
                                <div className="skeleton h-4 w-40 mb-6" />
                                <div className="skeleton h-64 w-full" />
                            </div>
                            <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-6">
                                <div className="skeleton h-4 w-32 mb-4" />
                                <div className="space-y-3">
                                    <div className="skeleton h-4 w-full" />
                                    <div className="skeleton h-4 w-5/6" />
                                    <div className="skeleton h-4 w-4/6" />
                                </div>
                            </div>
                        </div>
                    ) : hasResults ? (
                        <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                            <div className="flex flex-col gap-6">
                                <ChartSection data={state.data} />
                                <InsightSummary insight={state.insight} currentLanguage={language} />
                            </div>
                        </div>
                    ) : null}
                </div>

            </main>
        </div>
    );
};

export default QuickReportsPage;
