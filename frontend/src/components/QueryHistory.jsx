import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';

const QueryHistory = ({ history, onRerun }) => {
    if (!history || history.length === 0) return null;

    return (
        <div className="animate-fade-in">
            <div className="flex items-center space-x-2 mb-3 px-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Queries</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.slice().reverse().map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onRerun(item.question)}
                        className="w-full text-left group flex items-center justify-between p-3 rounded-xl bg-card-bg/70 border border-card-border hover:border-accent/25 hover:bg-accent/5 transition-all duration-200 shadow-sm hover:shadow-accent/5"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 truncate font-medium">
                                {item.question}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                                {item.time}
                            </p>
                        </div>
                        <RotateCcw className="w-3.5 h-3.5 text-gray-600 group-hover:text-accent transition-colors shrink-0 ml-2" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QueryHistory;
