import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Database, Shield, Globe, Mic, FileSpreadsheet, Github, ArrowRight, Store, Cpu } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{ backgroundColor: 'var(--dt-bg)', color: 'var(--dt-text)' }} className="min-h-screen font-sans selection:bg-amber-500/30 selection:text-amber-300">
            {/* Top Navigation */}
            <nav
                style={{
                    backgroundColor: 'var(--dt-surface)',
                    borderColor: 'var(--dt-border)'
                }}
                className="border-b sticky top-0 z-50 font-mono text-xs"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            style={{
                                backgroundColor: 'var(--dt-accent)',
                                color: 'var(--dt-accent-text)',
                                borderRadius: 'var(--dt-radius)'
                            }}
                            className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                        >
                            DT
                        </div>
                        <span className="font-semibold tracking-tight text-white">DataTalk AI</span>
                        <span style={{ color: 'var(--dt-text-faint)' }} className="hidden sm:inline">
                            // Ambient Retail Copilot
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <a href="https://github.com/pratyuuushhh101/DataTalk-AI" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                            <Github size={14} /> GitHub
                        </a>
                        <button
                            onClick={() => navigate('/datatalk')}
                            style={{
                                backgroundColor: 'var(--dt-accent)',
                                color: 'var(--dt-accent-text)',
                                borderRadius: 'var(--dt-radius)'
                            }}
                            className="px-4 py-2 font-semibold transition-opacity hover:opacity-90 flex items-center gap-2"
                        >
                            <span>LAUNCH WORKBENCH</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
                {/* <div
                    style={{
                        backgroundColor: 'var(--dt-surface)',
                        borderColor: 'var(--dt-border)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-amber-400 border mb-6"
                >
                    <Cpu size={13} />
                    <span>GROQ LLaMA 3.3 + AZURE SQL BACKED</span>
                </div> */
                }

                <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.15] mb-6">
                    Store-Floor Intelligence for <span className="text-amber-400">Kirana Stores</span>
                </h1>

                <p className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    A voice-first, multi-lingual retail copilot that bridges physical shelf telemetry with real-time financial analytics in English, Hindi, and Bengali.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => navigate('/datatalk')}
                        style={{
                            backgroundColor: 'var(--dt-accent)',
                            color: 'var(--dt-accent-text)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="w-full sm:w-auto px-6 py-3 font-mono text-xs font-bold tracking-wider hover:opacity-90 flex items-center justify-center gap-2"
                    >
                        <Terminal size={15} /> OPEN QUERY WORKBENCH
                    </button>
                    <a
                        href="https://vimeo.com/1178296866"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            backgroundColor: 'var(--dt-surface)',
                            borderColor: 'var(--dt-border)',
                            color: 'var(--dt-text)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="w-full sm:w-auto px-6 py-3 font-mono text-xs font-bold tracking-wider border hover:bg-white/5 flex items-center justify-center gap-2"
                    >
                        <span>WATCH DEMO (VIMEO)</span>
                    </a>
                </div>
            </section>

            {/* Architecture Grid */}
            <section className="py-20 px-6 max-w-6xl mx-auto border-t" style={{ borderColor: 'var(--dt-border)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        {
                            icon: <Store className="text-amber-400" size={20} />,
                            title: 'Spatial Store Telemetry',
                            desc: 'Organizes retail inventory across virtual store zones (Refrigeration, Snack Racks, Staples Bins) with real-time stock status.'
                        },
                        {
                            icon: <Globe className="text-teal-400" size={20} />,
                            title: 'Zero-Click Multilingual Voice',
                            desc: 'Whisper audio ingestion auto-detects English, Hindi, and Bengali instantly without requiring rigid menu selections.'
                        },
                        {
                            icon: <Database className="text-emerald-400" size={20} />,
                            title: 'Safe T-SQL Translation',
                            desc: 'Translates natural language questions directly into read-only Microsoft T-SQL queries executed safely against Azure SQL.'
                        }
                    ].map((feat, idx) => (
                        <div
                            key={idx}
                            style={{
                                backgroundColor: 'var(--dt-surface)',
                                borderColor: 'var(--dt-border)',
                                borderRadius: 'var(--dt-radius)'
                            }}
                            className="border p-6 flex flex-col justify-between"
                        >
                            <div className="w-9 h-9 rounded bg-black/30 border border-white/5 flex items-center justify-center mb-4">
                                {feat.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-2 font-mono tracking-wide">{feat.title}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
