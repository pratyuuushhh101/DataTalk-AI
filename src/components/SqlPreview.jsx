import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, Terminal, Copy, Check, Shield, Clock } from 'lucide-react';
import Card from './Card';

const SqlPreview = ({ sql }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!sql) return null;

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* fallback for older browsers */ }
    };

    return (
        <Card className="!p-0 overflow-hidden border-card-border animate-fade-in-up">
            <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer bg-surface/60 hover:bg-surface transition-colors border-b border-accent/8"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Database className="w-4 h-4 text-accent" />
                    </div>
                    <h3 className="font-semibold text-gray-200 text-sm">Generated SQL</h3>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Security Badges */}
                    <div className="hidden sm:flex items-center space-x-1 text-[10px] text-accent bg-accent/8 px-2 py-1 rounded-full font-medium">
                        <Shield className="w-3 h-3" />
                        <span>Read-only</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-1 text-[10px] text-accent/70 bg-accent/5 px-2 py-1 rounded-full font-medium tooltip-trigger">
                        <Clock className="w-3 h-3" />
                        <span>5s safe exec</span>
                        <div className="tooltip-content bg-surface text-gray-300 text-[10px] px-3 py-2 rounded-lg shadow-lg border border-accent/10">
                            Query execution is limited to 5 seconds with read-only access for safety
                        </div>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-md hover:bg-accent/10 transition-colors text-gray-500 hover:text-accent"
                        title="Copy SQL"
                    >
                        {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <div className="text-gray-500 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-[#0a120a] p-4 font-mono text-sm text-gray-400 overflow-x-auto relative animate-fade-in">
                    <div className="absolute top-2 right-3 flex items-center space-x-2">
                        <span className="text-[10px] text-gray-600 font-mono">SQL</span>
                        <Terminal className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed text-accent/80 pt-2">{sql}</pre>
                </div>
            )}
        </Card>
    );
};

export default SqlPreview;
