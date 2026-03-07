import React from 'react';
import { Globe } from 'lucide-react';

const Navbar = ({ language, setLanguage }) => {
    return (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-purple to-primary-blue">
                            DataTalk AI
                        </span>
                    </div>
                    <div className="flex items-center space-x-4 border border-gray-200 rounded-full px-4 py-1.5 shadow-sm hover:shadow-md transition-shadow">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="en">EN</option>
                            <option value="hi">हिंदी</option>
                            <option value="kn">ಕನ್ನಡ</option>
                        </select>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
