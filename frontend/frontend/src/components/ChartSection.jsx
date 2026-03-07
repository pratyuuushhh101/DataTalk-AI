import React, { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card from './Card';
import { LayoutTemplate } from 'lucide-react';

const ChartSection = ({ data }) => {
    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        const keys = Object.keys(data[0]);

        // Identify categorical, temporal, and numeric columns
        const categoricalKeys = keys.filter(key => typeof data[0][key] === 'string' && !key.toLowerCase().includes('date'));
        const temporalKeys = keys.filter(key => typeof data[0][key] === 'string' && key.toLowerCase().includes('date'));
        const numericKeys = keys.filter(key => typeof data[0][key] === 'number');

        if (numericKeys.length === 0) return null; // Nothing to chart

        // Determine X-axis
        let xAxisKey = 'id';
        let chartType = 'none';
        let processedData = data;

        if (temporalKeys.length > 0) {
            xAxisKey = temporalKeys[0];
            chartType = 'line';
        } else if (categoricalKeys.length > 0) {
            xAxisKey = categoricalKeys[0];
            chartType = 'bar';
        } else if (data.length > 1) {
            // Just map by index
            processedData = data.map((d, i) => ({ ...d, index: `Row ${i + 1}` }));
            xAxisKey = 'index';
            chartType = 'bar';
        } else {
            // Only 1 row of numeric data, no need for a chart, handled by KPIs
            return null;
        }

        // Determine Y-axis (take up to 2 numeric keys to prevent clutter)
        const yAxisKeys = numericKeys.slice(0, 2);

        return { xAxisKey, yAxisKeys, chartType, processedData };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <Card className="mb-6 h-96 flex flex-col items-center justify-center">
                <LayoutTemplate className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No data available for charting</p>
                <p className="text-sm text-gray-400 mt-1">Please ask a question to generate visual insights</p>
            </Card>
        );
    }

    if (!chartConfig) return null; // Cannot deduce a meaningful chart

    const colors = ['#6F42C1', '#007BFF', '#00CCCC'];

    return (
        <Card className="mb-6 border-t-4 border-t-primary-purple">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-2">
                Data Visualization
            </h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartConfig.chartType === 'line' ? (
                        <LineChart data={chartConfig.processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    activeDot={{ r: 8 }}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <BarChart data={chartConfig.processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={colors[index % colors.length]}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={60}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                />
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ChartSection;
