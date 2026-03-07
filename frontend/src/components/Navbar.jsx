import React from 'react';
import { Bell, User, Menu, Cloud, Shield } from 'lucide-react';

const Navbar = ({ isCollapsed, setIsCollapsed }) => {
    return (
        <nav className="flex justify-between items-center gap-4 mb-6 px-0 lg:px-2 w-full">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 shadow-sm"
            >
                <Menu size={20} />
            </button>

            <div className="flex items-center gap-3">
                {/* Azure Badge */}
                <div className="hidden sm:flex items-center space-x-1.5 bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Azure Powered</span>
                </div>

                {/* Security Badge */}
                <div className="hidden md:flex items-center space-x-1 border border-white/10 bg-white/5 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                    <Shield className="w-3 h-3 text-accent" />
                    <span>Secure</span>
                </div>

                <div className="w-10 h-10 ml-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative">
                    <Bell size={18} />
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_5px_var(--color-accent-glow)]"></span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <User size={18} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
