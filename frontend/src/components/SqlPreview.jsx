import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import Card from './Card';

const SqlPreview = ({ sql }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sql) return null;

    return (
        <Card className="!p-0 overflow-hidden mb-6 border-gray-200">
            <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-2 text-primary-purple">
                    <Database className="w-5 h-5" />
                    <h3 className="font-semibold text-gray-800">Generated SQL <span className="text-xs font-normal text-gray-500 ml-1">(AI Subquery)</span></h3>
                </div>
                <div className="text-gray-400 p-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </div>

            {isExpanded && (
                <div className="bg-[#1E1E1E] p-4 font-mono text-sm text-gray-300 overflow-x-auto relative">
                    <div className="absolute top-2 right-2 text-gray-500 opacity-50">
                        <Terminal className="w-4 h-4" />
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed">{sql}</pre>
                </div>
            )}
        </Card>
    );
};

export default SqlPreview;
