import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import UploadSection from '../components/UploadSection';
import QuerySection from '../components/QuerySection';
import SqlPreview from '../components/SqlPreview';
import KpiCards from '../components/KpiCards';
import ChartSection from '../components/ChartSection';
import InsightSummary from '../components/InsightSummary';
import RawDataTable from '../components/RawDataTable';
import { runQuery } from '../services/api';

const Dashboard = () => {
    const [state, setState] = useState({
        uploaded: false,
        loading: false,
        sql: "",
        data: [],
        insight: "",
        language: "en",
        error: null
    });

    const [question, setQuestion] = useState("");

    const setLanguage = (lang) => {
        setState(prev => ({ ...prev, language: lang }));
    };

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

    const handleQuerySubmit = async () => {
        if (!state.uploaded || !question.trim()) return;

        setState(prev => ({
            ...prev,
            loading: true,
            error: null,
            sql: "",
            data: [],
            insight: ""
        }));

        try {
            const response = await runQuery(question, state.language);

            setState(prev => ({
                ...prev,
                loading: false,
                sql: response.sql || "",
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

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            <Navbar language={state.language} setLanguage={setLanguage} />

            <main className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Multilingual Business Intelligence Assistant
                    </p>
                </header>

                {state.error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                        <h3 className="text-sm font-medium text-red-800">Error processing request</h3>
                        <p className="mt-1 text-sm text-red-700">{state.error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column (Upload & Query) */}
                    <div className="lg:col-span-4 space-y-6">
                        <UploadSection
                            onUploadSuccess={handleUploadSuccess}
                            currentLanguage={state.language}
                        />

                        <QuerySection
                            uploaded={state.uploaded}
                            loading={state.loading}
                            question={question}
                            setQuestion={setQuestion}
                            onSubmit={handleQuerySubmit}
                            currentLanguage={state.language}
                        />

                        <SqlPreview sql={state.sql} />
                    </div>

                    {/* Right Column (Results & Insights) */}
                    <div className="lg:col-span-8 flex flex-col">

                        {state.data && state.data.length > 0 ? (
                            <div className="animate-in fade-in duration-500">
                                <InsightSummary insight={state.insight} />
                                <KpiCards data={state.data} />

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                                    <div className="xl:col-span-2">
                                        <ChartSection data={state.data} />
                                    </div>
                                </div>

                                <RawDataTable data={state.data} />
                            </div>
                        ) : (
                            // Empty State
                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-12 min-h-[500px]">
                                <div className="text-center max-w-sm">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Data to Display</h3>
                                    <p className="text-sm text-gray-500">
                                        {state.uploaded ? "Ask a question to generate insights and visualize your data." : "Upload a dataset to begin analyzing your business data."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Dashboard;
