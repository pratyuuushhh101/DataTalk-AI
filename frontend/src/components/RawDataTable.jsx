import React, { useMemo } from 'react';
import Card from './Card';

const RawDataTable = ({ data }) => {
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    if (!data || data.length === 0) return null;

    const formatValue = (val) => {
        if (typeof val === 'number') {
            return val % 1 !== 0 ? val.toFixed(2) : val;
        }
        // Handle potential booleans or objects safely, though backend contract is mostly primitive types
        if (val === null || val === undefined) return '-';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
    };

    return (
        <Card className="!p-0 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-semibold text-gray-900">Query Results</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                    {data.length} row{data.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-blue-50/30 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
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
