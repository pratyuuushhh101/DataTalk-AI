import React, { useState } from 'react';
import UploadSection from '../components/UploadSection';
import QuerySection from '../components/QuerySection';
import SqlPreview from '../components/SqlPreview';
import KpiCards from '../components/KpiCards';
import ChartSection from '../components/ChartSection';
import InsightSummary from '../components/InsightSummary';
import RawDataTable from '../components/RawDataTable';
import QueryHistory from '../components/QueryHistory';
import { LANGUAGES } from '../components/Sidebar';
import { runQuery } from '../services/api';
import {
    BarChart3, Mic, Globe, Shield, Cloud, Database,
    CheckCircle, ArrowRight, Sparkles, Zap, RefreshCw
} from 'lucide-react';

const Dashboard = ({ language }) => {
    const [state, setState] = useState({
        uploaded: sessionStorage.getItem('datasetUploaded') === 'true',
        loading: false,
        sql: "",
        data: [],
        insight: "",
        error: null
    });

    const [question, setQuestion] = useState("");
    const [queryHistory, setQueryHistory] = useState([]);

    const activeLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    const handleUploadSuccess = () => {
        setState(prev => ({
            ...prev,
            uploaded: true,
            error: null,
            sql: "",
            data: [],
            insight: ""
        }));
        setQuestion("");
    };

    const handleRefreshDataset = () => {
        sessionStorage.removeItem('datasetUploaded');
        sessionStorage.removeItem('datasetName');
        sessionStorage.removeItem('datasetSize');
        setState({
            uploaded: false,
            loading: false,
            sql: "",
            data: [],
            insight: "",
            error: null
        });
        setQuestion("");
        setQueryHistory([]);
    };

    const handleQuerySubmit = async (queryText) => {
        const q = typeof queryText === 'string' ? queryText : question;
        if (!state.uploaded || !q.trim()) return;

        setState(prev => ({
            ...prev,
            loading: true,
            error: null,
            sql: "",
            data: [],
            insight: ""
        }));

        try {
            const response = await runQuery(q, language);

            setState(prev => ({
                ...prev,
                loading: false,
                sql: response.sql || "",
                data: response.data || [],
                insight: response.insight || "",
            }));

            // Reset chat input after successful submission
            setQuestion("");

            // Add to session history
            setQueryHistory(prev => [...prev, {
                question: q,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message,
                data: []
            }));
        }
    };

    const handleRerunQuery = (q) => {
        setQuestion(q);
    };

    const hasResults = state.data && state.data.length > 0;
    const currentStep = !state.uploaded ? 1 : hasResults ? 3 : 2;

    return (
        <div className="flex flex-col min-h-screen">
            {/* ===== HERO SECTION ===== */}
            <div className="hero-gradient text-white rounded-2xl mb-6 shadow-md border border-white/5">
                <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="text-center lg:text-left animate-fade-in-up">
                            <h1 className="text-3xl lg:text-4xl font-semibold tracking-normal mb-3 text-white">
                                DataTalk AI
                            </h1>
                            <p className="text-base lg:text-lg text-[#B5FF7D]/90 font-medium tracking-wide mb-2">
                                Multilingual AI Business Intelligence for Indian MSMEs
                            </p>
                            <p className="text-sm text-gray-500 max-w-lg leading-relaxed font-light mt-1">
                                Ask questions in <strong className="text-white font-normal">Hindi</strong>, <strong className="text-white font-normal">Bengali</strong>, or <strong className="text-white font-normal">English</strong> —
                                type or use voice — and get instant SQL, charts, and AI insights from your business data.
                            </p>

                            {/* Feature pills */}
                            <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
                                <span className="flex items-center space-x-1.5 bg-accent/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-accent/90">
                                    <Mic className="w-3 h-3" />
                                    <span>Voice Input</span>
                                </span>
                                <span className="flex items-center space-x-1.5 bg-accent/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-accent/90">
                                    <Globe className="w-3 h-3" />
                                    <span>3 Languages</span>
                                </span>
                                <span className="flex items-center space-x-1.5 bg-accent/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-accent/90">
                                    <Cloud className="w-3 h-3" />
                                    <span>Azure Powered</span>
                                </span>
                                <span className="flex items-center space-x-1.5 bg-accent/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-accent/90">
                                    <Shield className="w-3 h-3" />
                                    <span>Safe Queries</span>
                                </span>
                            </div>
                        </div>

                        {/* Step Indicators */}
                        <div className="flex items-center space-x-3 bg-accent/5 backdrop-blur-sm border border-accent/10 rounded-2xl px-6 py-4 animate-slide-in-right">
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentStep >= 1 ? 'bg-accent text-background shadow-lg shadow-accent/30' : 'bg-accent/10 text-gray-500'
                                    }`}>
                                    {state.uploaded ? <CheckCircle className="w-5 h-5 text-background" /> : '1'}
                                </div>
                                <span className="text-[10px] mt-2 font-medium tracking-wide text-gray-500 uppercase">Upload</span>
                            </div>

                            <ArrowRight className={`w-5 h-5 transition-colors ${currentStep >= 2 ? 'text-accent' : 'text-gray-600'}`} />

                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentStep >= 2 ? 'bg-accent text-background shadow-lg shadow-accent/30' : 'bg-accent/10 text-gray-500'
                                    }`}>
                                    {hasResults ? <CheckCircle className="w-5 h-5 text-background" /> : '2'}
                                </div>
                                <span className="text-[10px] mt-2 font-medium tracking-wide text-gray-500 uppercase">Ask</span>
                            </div>

                            <ArrowRight className={`w-5 h-5 transition-colors ${currentStep >= 3 ? 'text-accent' : 'text-gray-600'}`} />

                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentStep >= 3 ? 'bg-accent text-background shadow-lg shadow-accent/30' : 'bg-accent/10 text-gray-500'
                                    }`}>
                                    {hasResults ? <Sparkles className="w-5 h-5 text-background" /> : '3'}
                                </div>
                                <span className="text-[10px] mt-2 font-medium tracking-wide text-gray-500 uppercase">Insights</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Error Banner */}
                {state.error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/20 flex items-start space-x-3 animate-fade-in-up">
                        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-red-400 text-sm font-bold">!</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-red-300">Error processing request</h3>
                            <p className="mt-0.5 text-sm text-red-400">{state.error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* ===== LEFT COLUMN ===== */}
                    <div className="lg:col-span-4 space-y-5">
                        <div className="animate-fade-in-up">
                            <UploadSection
                                key={state.uploaded ? 'active' : 'inactive'}
                                onUploadSuccess={handleUploadSuccess}
                                currentLanguage={language}
                            />
                            {state.uploaded && (
                                <button
                                    onClick={handleRefreshDataset}
                                    className="w-full mt-3 flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent group outline-none"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                                    Refresh Dataset
                                </button>
                            )}
                        </div>

                        <div className="animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                            <QuerySection
                                uploaded={state.uploaded}
                                loading={state.loading}
                                question={question}
                                setQuestion={setQuestion}
                                onSubmit={handleQuerySubmit}
                                currentLanguage={language}
                            />
                        </div>

                        {state.sql && (
                            <div className="animate-fade-in-up">
                                <SqlPreview sql={state.sql} />
                            </div>
                        )}

                        {/* Query History */}
                        {queryHistory.length > 0 && (
                            <div className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                                <QueryHistory history={queryHistory} onRerun={handleRerunQuery} />
                            </div>
                        )}
                    </div>

                    {/* ===== RIGHT COLUMN ===== */}
                    <div className="lg:col-span-8 flex flex-col">
                        {state.loading ? (
                            /* Skeleton Loaders */
                            <div className="space-y-5 animate-fade-in">
                                {/* Skeleton KPIs */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-5">
                                            <div className="skeleton h-3 w-20 mb-3" />
                                            <div className="skeleton h-8 w-24" />
                                        </div>
                                    ))}
                                </div>
                                {/* Skeleton Chart */}
                                <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-6">
                                    <div className="skeleton h-4 w-40 mb-6" />
                                    <div className="skeleton h-64 w-full" />
                                </div>
                                {/* Skeleton Table */}
                                <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-5">
                                    <div className="skeleton h-4 w-32 mb-4" />
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="skeleton h-8 w-full" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : hasResults ? (
                            <div className="space-y-0">
                                {/* Language Response Badge */}
                                <div className="mb-4 flex items-center space-x-2 animate-fade-in">
                                    <span className="flex items-center space-x-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-semibold">
                                        <Globe className="w-3 h-3" />
                                        <span>Responding in: {activeLang.native}</span>
                                    </span>
                                    <span className="flex items-center space-x-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-medium">
                                        <Zap className="w-3 h-3" />
                                        <span>Results ready</span>
                                    </span>
                                </div>

                                <InsightSummary insight={state.insight} currentLanguage={language} />
                                <KpiCards data={state.data} />
                                <ChartSection data={state.data} />
                                <RawDataTable data={state.data} />
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="flex-1 bg-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-card-border flex items-center justify-center p-12 min-h-[500px]">
                                <div className="text-center max-w-sm animate-fade-in">
                                    <div className="w-20 h-20 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float">
                                        <BarChart3 className="w-10 h-10 text-accent/60" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-100 mb-2">
                                        {state.uploaded ? 'Ready to Analyze' : 'Welcome to DataTalk AI'}
                                    </h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {state.uploaded
                                            ? 'Ask a question in any language to generate insights, charts, and AI analysis from your business data.'
                                            : 'Upload a CSV or Excel dataset to begin analyzing your business data with natural language queries.'
                                        }
                                    </p>
                                    {!state.uploaded && (
                                        <div className="mt-4 flex items-center justify-center space-x-3 text-xs text-gray-600">
                                            <span>Voice</span><span>·</span>
                                            <span>Hindi</span><span>·</span>
                                            <span>Bengali</span><span>·</span>
                                            <span>English</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ===== ENTERPRISE FOOTER ===== */}
            <footer className="border-t border-accent/8 bg-surface/50">
                <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1.5 text-xs text-gray-500">
                                <Cloud className="w-3.5 h-3.5 text-accent" />
                                <span>Powered by <strong className="text-accent">Azure OpenAI</strong> + <strong className="text-accent">Azure SQL</strong></span>
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1 text-[11px] text-gray-600">
                                <Shield className="w-3 h-3" />
                                <span>Secure Azure SQL Execution</span>
                            </span>
                            <span className="text-gray-700">|</span>
                            <span className="flex items-center space-x-1 text-[11px] text-gray-600">
                                <Database className="w-3 h-3" />
                                <span>Read-only queries enforced</span>
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
