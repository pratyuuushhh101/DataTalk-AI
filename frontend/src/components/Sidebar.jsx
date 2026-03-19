import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Brain,
    Database,
    Zap,
    TrendingUp,
    HeadphonesIcon,
    Settings,
    LogOut,
    MessageSquare,
    Camera
} from 'lucide-react';



const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#0f0f11] h-screen fixed left-0 top-0 border-r border-[#1a1a1c] flex flex-col pt-6 pb-6 px-4 z-50 overflow-y-auto transition-all duration-300`}>
            {/* Brand */}
            <div className={`flex items-center gap-3 mb-10 text-white font-bold text-xl px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-[#B5FF7D] flex items-center justify-center shrink-0 relative">
                    <div className="w-3 h-3 rounded-sm bg-[#0f0f11] transform rotate-45" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-[#0f0f11] bg-transparent opacity-30" />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap">DataTalk AI</span>}
            </div>

            <nav className="flex-1 flex flex-col gap-8">
                {/* MAIN Menu */}
                <section>
                    {!isCollapsed && <div className="text-[11px] font-bold text-gray-500 mb-3 px-2 uppercase">Main</div>}
                    <div className="flex flex-col gap-1">
                        <Link to="/datatalk" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${isActive('/datatalk') ? 'bg-[#B5FF7D] text-black font-semibold shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'} ${isCollapsed ? 'justify-center' : ''}`}>
                            <Brain size={18} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm">DataTalk</span>}
                        </Link>
                        <Link to="/ledger" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${isActive('/ledger') ? 'bg-[#B5FF7D] text-black font-semibold shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'} ${isCollapsed ? 'justify-center' : ''}`}>
                            <Database size={18} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm">Data Ledger</span>}
                        </Link>
                    </div>
                </section>

                {/* INSIGHT Menu */}
                <section>
                    {!isCollapsed && <div className="text-[11px] font-bold text-gray-500 mb-3 px-2 uppercase">Insight</div>}
                    <div className="flex flex-col gap-1">
                        <Link to="/reports" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${isActive('/reports') ? 'bg-[#B5FF7D] text-black font-semibold shadow-sm' : 'text-gray-400 border border-white/10 hover:text-white hover:bg-white/5 font-medium'} ${isCollapsed ? 'justify-center' : ''}`}>
                            <Zap size={18} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm">Quick Reports</span>}
                        </Link>
                        <Link to="/profit" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${isActive('/profit') ? 'bg-[#B5FF7D] text-black font-semibold shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'} ${isCollapsed ? 'justify-center' : ''}`}>
                            <TrendingUp size={18} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm">Profit Analysis</span>}
                        </Link>
                    </div>
                </section>

                <div className="mt-auto" />

                {/* TOOLS Menu */}
                <section>
                    {!isCollapsed && <div className="text-[11px] font-bold text-gray-500 mb-3 px-2 uppercase">Tools</div>}
                    <div className="flex flex-col gap-1">
                        <a href="#" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
                            <HeadphonesIcon size={18} className="shrink-0 group-hover:text-white transition-colors" />
                            {!isCollapsed && <span className="text-sm font-medium">Support</span>}
                        </a>
                        <a href="#" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
                            <Settings size={18} className="shrink-0 group-hover:text-white transition-colors" />
                            {!isCollapsed && <span className="text-sm font-medium">Setting</span>}
                        </a>
                    </div>
                </section>

                <div className="mt-4 border-t border-white/5 pt-4 flex flex-col gap-1">


                    {/* Logout Button */}
                    <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
                        <LogOut size={18} className="shrink-0 group-hover:text-red-400 transition-colors" />
                        {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
                    </Link>

                    {/* WhatsApp Chatbot Card */}
                    <Link to="/whatsapp" className="mt-4 block animate-fade-in outline-none">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-[#25D366]/30 hover:bg-[#25D366]/5 transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a9.624 9.624 0 0 1-4.912-1.343l-.352-.21-3.655.959.976-3.561-.23-.367a9.625 9.625 0 1 1 8.173 4.522m0-16.142C6.444 2.994.012 9.427.012 17.356c0 2.532.651 5.004 1.888 7.187L.012 32l7.78-2.04a14.32 14.32 0 0 0 6.564 1.583c7.923 0 14.354-6.432 14.354-14.387 0-3.84-1.494-7.449-4.204-10.158A14.31 14.31 0 0 0 14.351 2.994z" />
                                        </svg>
                                    </div>
                                    {!isCollapsed && <span className="text-[10px] font-bold text-[#25D366] uppercase tracking-wider">WhatsApp Chatbot 💬</span>}
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Smart Log Scanner Card */}
                    <Link to="/under-construction" state={{ fromOCR: true }} className="mt-2 block animate-fade-in outline-none">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Camera size={14} className="text-blue-500" />
                                    </div>
                                    {!isCollapsed && <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Smart Log Scanner 📸</span>}
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
