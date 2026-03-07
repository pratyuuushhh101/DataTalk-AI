import React from 'react';
import Card from './Card';
import { Lightbulb } from 'lucide-react';

const InsightSummary = ({ insight }) => {
    if (!insight) return null;

    return (
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100 shadow-md">
            <div className="flex items-start space-x-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-yellow-500 shrink-0">
                    <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">
                        AI Insight
                    </h3>
                    <p className="text-indigo-950 font-medium leading-relaxed text-lg">
                        {insight}
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default InsightSummary;
