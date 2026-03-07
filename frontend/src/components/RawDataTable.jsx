import React, { useMemo } from 'react';
import { Download, Table } from 'lucide-react';
import Card from './Card';

const RawDataTable = ({ data }) => {
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    if (!data || data.length === 0) return null;

    const formatValue = (val) => {
        if (typeof val === 'number') {
            return val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString();
        }
        if (val === null || val === undefined) return '—';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
    };

    const handleDownloadCSV = () => {
        const headers = columns.join(',');
        const rows = data.map(row =>
            columns.map(col => {
                const val = row[col];
                const str = val === null || val === undefined ? '' : String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `datatalk_results_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Card className="!p-0 overflow-hidden animate-fade-in-up">
            <div className="px-5 py-4 border-b border-accent/8 flex items-center justify-between bg-surface/60">
                <div className="flex items-center space-x-2">
                    <Table className="w-4 h-4 text-gray-500" />
                    <h3 className="text-base font-bold text-gray-100">Query Results</h3>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-400 bg-accent/8 px-3 py-1 rounded-full font-medium">
                        {data.length} row{data.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={handleDownloadCSV}
                        className="flex items-center space-x-1.5 text-xs font-medium text-accent bg-accent/8 hover:bg-accent/15 px-3 py-1.5 rounded-lg transition-colors"
                        title="Download as CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-accent/8">
                    <thead className="bg-surface/80 sticky top-0 z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-card-bg divide-y divide-accent/5">
                        {data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-accent/5 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className="px-5 py-3 whitespace-nowrap text-sm text-gray-300"
                                    >
                                        {formatValue(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default RawDataTable;
