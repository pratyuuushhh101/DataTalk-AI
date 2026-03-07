import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    BarChart3,
    Zap,
    Globe,
    Mic,
    FileSpreadsheet,
    Github,
    ChevronRight,
    ArrowRight
} from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f0f11] font-sans text-gray-200 overflow-x-hidden selection:bg-[#B5FF7D]/30 selection:text-[#B5FF7D]">
            {/* Ambient Multi-Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#B5FF7D]/5 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#B5FF7D]/5 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute top-[40%] left-[80%] w-[30%] h-[30%] bg-[#00CCCC]/5 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="border-b border-white/5 bg-[#0f0f11]/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#B5FF7D] flex items-center justify-center shrink-0 relative shadow-[0_0_15px_rgba(181,255,125,0.2)]">
                                <div className="w-3 h-3 rounded-sm bg-[#0f0f11] transform rotate-45" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-[#0f0f11] bg-transparent opacity-30" />
                            </div>
                            <span className="text-white font-bold text-xl tracking-tight">DataTalk AI</span>
                        </div>

                        {/* Middle Links */}
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
                            <a href="#about" className="hover:text-white transition-colors">About</a>
                            <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Github size={16} /> GitHub
                            </a>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:border-[#B5FF7D]/50 flex items-center gap-2"
                        >
                            Launch App <ArrowRight size={16} className="text-[#B5FF7D]" />
                        </button>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="pt-32 pb-24 px-6 relative">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#B5FF7D]/10 border border-[#B5FF7D]/20 text-[#B5FF7D] text-sm font-semibold mb-8">
                            <Zap size={14} className="fill-[#B5FF7D]" />
                            <span>AI-Powered Business Intelligence</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-8">
                            Turn Data Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B5FF7D] to-[#00CCCC]">Insights</span> With Natural Language
                        </h1>
                        <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Upload CSV data and ask questions in plain English to generate SQL, charts, and actionable AI insights instantly. No coding required.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto bg-[#B5FF7D] hover:bg-[#a2e570] text-black font-semibold rounded-xl py-3.5 px-8 flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(181,255,125,0.2)] hover:shadow-[0_6px_20px_rgba(181,255,125,0.3)] text-lg group"
                            >
                                Try Demo <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer rounded-xl py-3.5 px-8 flex items-center justify-center gap-2 transition-all font-semibold text-lg"
                            >
                                <Github size={20} /> View GitHub
                            </a>
                        </div>
                    </div>
                </section>

                {/* Features Divider */}
                <div className="h-px w-full max-w-7xl mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Features Section */}
                <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Enterprise-Grade BI Features</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Everything you need to analyze datasets without writing a single line of SQL or Python.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature Cards */}
                        {[
                            { icon: <MessageSquare className="text-[#00CCCC]" size={24} />, title: 'Natural Language → SQL', desc: 'Ask questions in plain english and watch the AI translate it into production-ready SQL queries instantly.' },
                            { icon: <BarChart3 className="text-[#F59E0B]" size={24} />, title: 'Auto Chart Generation', desc: 'Get beautiful, responsive charts generated automatically based on the context of your data request.' },
                            { icon: <Zap className="text-[#B5FF7D]" size={24} />, title: 'AI Generated Insights', desc: 'Receive rich text summaries and actionable business insights explaining your data trends.' },
                            { icon: <Globe className="text-[#3b82f6]" size={24} />, title: 'Multilingual Support', desc: 'Query your data in Hindi, Bengali, or English. Breaking language barriers for Indian MSMEs.' },
                            { icon: <Mic className="text-[#8B5CF6]" size={24} />, title: 'Voice Query capabilities', desc: 'Just speak to your dataset. Integrated Azure Speech services powers seamless vocal interactions.' },
                            { icon: <FileSpreadsheet className="text-[#10B981]" size={24} />, title: 'Instant CSV Uploads', desc: 'Drag and drop your dataset. Our engine automatically parses, cleans, and tables your data securely.' },
                        ].map((feat, idx) => (
                            <div key={idx} className="bg-[#1a1a1c] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors group">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {feat.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Demo Workflow Section */}
                <section id="demo" className="py-24 px-6 bg-[#141416]/50 border-y border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-[-10%] w-[30%] h-full bg-[#B5FF7D]/5 blur-[120px] mix-blend-screen pointer-events-none" />
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Get from raw CSV to visualized business insights in under a minute.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { step: '1', title: 'Upload Data', desc: 'Drag and drop your CSV dataset into the dashboard. It is processed securely inside your browser session.' },
                                { step: '2', title: 'Ask Questions', desc: 'Use voice or text to ask questions about your data in English, Hindi, or Bengali.' },
                                { step: '3', title: 'Get Answers', desc: 'Receive instant SQL queries, beautiful charts, and detailed AI insights summarizing your answers.' }
                            ].map((item, idx) => (
                                <div key={idx} className="relative bg-[#1a1a1c] border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-[#B5FF7D]/10 border border-[#B5FF7D]/30 flex items-center justify-center text-2xl font-bold text-[#B5FF7D] mb-6 shadow-[0_0_20px_rgba(181,255,125,0.1)]">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
                                    {idx !== 2 && (
                                        <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-[#B5FF7D]/50 to-transparent" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tech Stack */}
                <section className="py-24 px-6 max-w-7xl mx-auto text-center">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-10">Powered By Modern Stack</h2>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {['React', 'TailwindCSS', 'Node.js', 'Azure SQL', 'Gemini AI', 'Azure Speech'].map((tech) => (
                            <div key={tech} className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                {tech}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final CTA Strip */}
                <section className="py-24 px-6 max-w-5xl mx-auto">
                    <div className="bg-gradient-to-br from-[#1a1a1c] to-[#0f0f11] border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-[-50%] left-[-20%] w-[60%] h-[150%] bg-[#B5FF7D]/10 blur-[100px] rounded-[100%] mix-blend-screen pointer-events-none transform -rotate-45" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Start Exploring Your Data</h2>
                            <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">Stop writing boilerplate queries. Unleash the power of AI on your datasets today.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-[#B5FF7D] hover:bg-[#a2e570] text-black font-semibold rounded-xl py-4 px-10 text-lg transition-all shadow-[0_4px_14px_0_rgba(181,255,125,0.2)] hover:shadow-[0_6px_20px_rgba(181,255,125,0.3)] hover:scale-105"
                            >
                                Launch Dashboard
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer id="about" className="border-t border-white/5 py-12 bg-[#141416]/50">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#B5FF7D] flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-sm bg-[#0f0f11] transform rotate-45" />
                            </div>
                            <span className="font-semibold text-gray-300">DataTalk AI</span>
                            <span>© {new Date().getFullYear()}</span>
                        </div>

                        <div className="font-medium">Built for Hackathon Project</div>

                        <div className="flex items-center gap-6">
                            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                <Github size={16} /> source code
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
