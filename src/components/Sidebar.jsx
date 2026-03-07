import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Brain,
    Database,
    Zap,
    TrendingUp,
    HeadphonesIcon,
    Settings,
    Globe,
    LogOut
} from 'lucide-react';

export const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳', native: 'Hindi' },
    { code: 'bn', label: 'বাংলা', flag: '🇮🇳', native: 'Bengali' },
];

const Sidebar = ({ isCollapsed, setIsCollapsed, language, setLanguage }) => {
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
                    {/* Language Selector */}
                    <div className={`flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white transition-colors group ${isCollapsed ? 'justify-center relative' : ''}`}>
                        <Globe size={18} className="shrink-0 group-hover:text-accent transition-colors" />
                        {!isCollapsed && (
                            <select
                                value={language}
                                onChange={(e) => setLanguage && setLanguage(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-gray-300 focus:outline-none focus:ring-0 cursor-pointer pr-2 w-full appearance-none group-hover:text-white"
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code} className="bg-[#141416] text-gray-200">
                                        {lang.flag} {lang.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Logout Button */}
                    <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
                        <LogOut size={18} className="shrink-0 group-hover:text-red-400 transition-colors" />
                        {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
                    </Link>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
