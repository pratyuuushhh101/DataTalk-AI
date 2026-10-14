import React, { useState, useEffect } from 'react';
import UploadSection from '../components/UploadSection';
import QuerySection from '../components/QuerySection';
import SqlPreview from '../components/SqlPreview';
import KpiCards from '../components/KpiCards';
import ChartSection from '../components/ChartSection';
import InsightSummary from '../components/InsightSummary';
import RawDataTable from '../components/RawDataTable';
import QueryHistory from '../components/QueryHistory';
import { runQuery } from '../services/api';
import { AlertCircle, Store, Package, Terminal } from 'lucide-react';

const STORE_ZONES = [
    { id: 'dairy', name: 'ZONE_A // REFRIGERATION', items: 'Amul Milk 1L', status: 'OPTIMAL', color: '#14b8a6', query: 'Show sales for Amul Milk' },
    { id: 'snacks', name: 'ZONE_B // SNACK_RACK', items: 'Maggi, Parle-G', status: 'HIGH_VELOCITY', color: '#f59e0b', query: 'Top 5 products by revenue' },
    { id: 'grains', name: 'ZONE_C // STAPLES_BIN', items: 'Aashirvaad Atta, Tata Salt', status: 'STABLE', color: '#10b981', query: 'Show inventory stock levels' },
    { id: 'beverages', name: 'ZONE_D // BEVERAGES_OILS', items: 'Red Label Tea, Fortune Oil', status: 'STABLE', color: '#8b5cf6', query: 'Show revenue breakdown by region' }
];

const Dashboard = () => {
    const [state, setState] = useState({
        uploaded: sessionStorage.getItem('datasetUploaded') === 'true',
        loading: false,
        sql: '',
        data: [],
        insight: '',
        error: null
    });

    const [question, setQuestion] = useState('');
    const [queryHistory, setQueryHistory] = useState([]);
    const [detectedLang, setDetectedLang] = useState('en');
    const [activeZone, setActiveZone] = useState(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-ui', 'terminal');
    }, []);

    const detectLanguage = (text) => {
        if (!text) return 'en';
        if (/[\u0980-\u09FF]/.test(text)) return 'bn';
        if (/[\u0900-\u097F]/.test(text)) return 'hi';
        const lower = text.toLowerCase();
        if (/\b(koto|hoyeche|bikri|ponno|shobcheye|laabh|taka|theke)\b/.test(lower)) return 'bn';
        if (/\b(kitna|hua|sabse|zyada|kya|hai|kul|munafa|batao|dikhao)\b/.test(lower)) return 'hi';
        return 'en';
    };

    const handleUploadSuccess = () => {
        setState((prev) => ({
            ...prev,
            uploaded: true,
            error: null,
            sql: '',
            data: [],
            insight: ''
        }));
        setQuestion('');
    };

    const handleRefreshDataset = () => {
        sessionStorage.removeItem('datasetUploaded');
        sessionStorage.removeItem('datasetName');
        sessionStorage.removeItem('datasetSize');
        setState({
            uploaded: false,
            loading: false,
            sql: '',
            data: [],
            insight: '',
            error: null
        });
        setQuestion('');
        setQueryHistory([]);
    };

    const handleQuerySubmit = async (queryText, explicitLang = null) => {
        const q = typeof queryText === 'string' ? queryText : question;
        if (!state.uploaded || !q.trim()) return;

        const lang = explicitLang || detectLanguage(q);
        setDetectedLang(lang);

        setState((prev) => ({
            ...prev,
            loading: true,
            error: null,
            sql: '',
            data: [],
            insight: ''
        }));

        try {
            const response = await runQuery(q);
            setState((prev) => ({
                ...prev,
                loading: false,
                sql: response.sql || '',
                data: response.data || [],
                insight: response.insight || ''
            }));
            setQuestion('');
            setQueryHistory((prev) => [
                {
                    question: q,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                ...prev.slice(0, 14)
            ]);
        } catch (error) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: error.message,
                data: []
            }));
        }
    };

    const hasResults = state.data && state.data.length > 0;

    return (
        <div style={{ backgroundColor: 'var(--dt-bg)', color: 'var(--dt-text)' }} className="min-h-screen">
            {/* CLEAN TERMINAL HEADER */}
            <header
                style={{
                    backgroundColor: 'var(--dt-surface)',
                    borderColor: 'var(--dt-border)'
                }}
                className="border-b px-6 py-3 flex items-center justify-between sticky top-0 z-30 font-mono text-xs"
            >
                <div className="flex items-center gap-2.5">
                    <Terminal size={15} style={{ color: 'var(--dt-accent)' }} />
                    <span className="font-semibold tracking-wider uppercase">STORE_FLOOR // AMBIENT_COPILOT</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--dt-text-faint)' }}>
                    <span>AZURE SQL: CONNECTED</span>
                    <span>·</span>
                    <span>GROQ: ACTIVE</span>
                </div>
            </header>

            <main className="max-w-[92rem] mx-auto px-6 py-6 space-y-4 font-sans">
                {state.error && (
                    <div
                        style={{ borderRadius: 'var(--dt-radius)' }}
                        className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2.5"
                    >
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{state.error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <UploadSection
                        onUploadSuccess={handleUploadSuccess}
                        compact={state.uploaded}
                        onReset={handleRefreshDataset}
                    />

                    {/* Store Floor Schematic */}
                    <div
                        style={{
                            backgroundColor: 'var(--dt-surface)',
                            borderColor: 'var(--dt-border)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="border p-4"
                    >
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b font-mono text-xs" style={{ borderColor: 'var(--dt-border)' }}>
                            <div className="flex items-center gap-2">
                                <Store size={14} style={{ color: 'var(--dt-accent)' }} />
                                <span className="uppercase tracking-wider font-semibold">
                                    TELEMETRY // STORE_ZONES_MAP
                                </span>
                            </div>
                            <span className="text-[10px]" style={{ color: 'var(--dt-text-faint)' }}>
                                SELECT ZONE TO QUERY
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {STORE_ZONES.map((zone) => {
                                const isSelected = activeZone?.id === zone.id;
                                return (
                                    <button
                                        key={zone.id}
                                        onClick={() => {
                                            setActiveZone(zone);
                                            handleQuerySubmit(zone.query);
                                        }}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--dt-surface-3)' : 'var(--dt-surface-2)',
                                            borderColor: isSelected ? 'var(--dt-accent)' : 'var(--dt-border)',
                                            borderRadius: 'var(--dt-radius)'
                                        }}
                                        className="p-3.5 text-left border transition-all hover:opacity-90 flex flex-col justify-between gap-2.5 group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-20 h-20 opacity-5 pointer-events-none transform translate-x-5 -translate-y-5">
                                            <Package size={80} />
                                        </div>
                                        <div className="flex items-center justify-between font-mono">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: zone.color }}
                                            />
                                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/30" style={{ color: 'var(--dt-text-faint)' }}>
                                                {zone.status}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-mono font-semibold tracking-tight" style={{ color: 'var(--dt-text)' }}>
                                                {zone.name}
                                            </h4>
                                            <p className="text-[11px] mt-1" style={{ color: 'var(--dt-text-muted)' }}>
                                                {zone.items}
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-mono" style={{ color: 'var(--dt-accent)' }}>
                                            [EXECUTE] →
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {state.uploaded && (
                        <QuerySection
                            uploaded={state.uploaded}
                            loading={state.loading}
                            question={question}
                            setQuestion={setQuestion}
                            onSubmit={handleQuerySubmit}
                        />
                    )}

                    {state.loading && (
                        <div className="space-y-4">
                            <div className="skeleton h-20 w-full" />
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                <div className="lg:col-span-7 skeleton h-72" />
                                <div className="lg:col-span-5 skeleton h-72" />
                            </div>
                        </div>
                    )}

                    {hasResults && !state.loading && (
                        <div className="space-y-4 animate-fade-in">
                            <KpiCards data={state.data} />
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                <div className="lg:col-span-7">
                                    <ChartSection data={state.data} className="h-full" />
                                </div>
                                <div className="lg:col-span-5">
                                    <InsightSummary
                                        insight={state.insight}
                                        questionLanguage={detectedLang}
                                        className="h-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                <div className="lg:col-span-8">
                                    <RawDataTable data={state.data} inline />
                                </div>
                                <div className="lg:col-span-4 space-y-4">
                                    <SqlPreview sql={state.sql} inline />
                                    <QueryHistory
                                        history={queryHistory}
                                        onSelect={(q) => handleQuerySubmit(q)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
