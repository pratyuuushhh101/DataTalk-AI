import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ language, setLanguage, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-[#0f0f11] flex font-sans">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} language={language} setLanguage={setLanguage} />
            <div className={`flex-1 flex flex-col pt-6 pb-6 pr-6 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
                {/* Navbar */}
                <Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

                {/* Main Content Area */}
                <main className="flex-1 relative">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
