import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card from './Card';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

const COLORS = ['#B5FF7D', '#92d822', '#00CCCC', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899'];

const CHART_OPTIONS = [
    { id: 'bar', label: 'Bar', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'line', label: 'Line', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'area', label: 'Area', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'pie', label: 'Pie', icon: <PieIcon className="w-3.5 h-3.5" /> },
];

const ChartSection = ({ data }) => {
    const [chartType, setChartType] = useState('bar');

    // Auto-select pie if the data comes in perfectly formatted for it, else default to 'bar', but don't force it continuously
    useEffect(() => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        const categoricalKeys = keys.filter(key => typeof data[0][key] === 'string' && !key.toLowerCase().includes('date'));
        const numericKeys = keys.filter(key => typeof data[0][key] === 'number');

        if (categoricalKeys.length === 1 && numericKeys.length === 1 && data.length <= 8 && data.length > 1) {
            setChartType('pie');
        } else {
            setChartType('bar');
        }
    }, [data]);

    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        const keys = Object.keys(data[0]);
        const categoricalKeys = keys.filter(key => typeof data[0][key] === 'string' && !key.toLowerCase().includes('date'));
        const temporalKeys = keys.filter(key => typeof data[0][key] === 'string' && key.toLowerCase().includes('date'));
        const numericKeys = keys.filter(key => typeof data[0][key] === 'number');

        if (numericKeys.length === 0) return null;

        let xAxisKey = 'id';
        let processedData = data;

        if (temporalKeys.length > 0) {
            xAxisKey = temporalKeys[0];
        } else if (categoricalKeys.length > 0) {
            xAxisKey = categoricalKeys[0];
        } else if (data.length > 1) {
            processedData = data.map((d, i) => ({ ...d, index: `Row ${i + 1}` }));
            xAxisKey = 'index';
        } else {
            return null;
        }

        const yAxisKeys = numericKeys.slice(0, 2);
        return { xAxisKey, yAxisKeys, processedData };
    }, [data]);

    if (!data || data.length === 0 || !chartConfig) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload) return null;
        return (
            <div className="bg-surface/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-accent/10">
                <p className="text-xs font-semibold text-gray-200 mb-1.5">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-xs text-gray-400">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color || COLORS[i % COLORS.length] }} />
                        {p.name}: <span className="font-semibold text-gray-200">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <Card className="mb-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-100">Data Visualization</h3>

                {/* Chart Type Selector */}
                <div className="flex bg-[#0f0f11] p-1 rounded-lg border border-white/5 shadow-inner">
                    {CHART_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setChartType(option.id)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${chartType === option.id
                                    ? 'bg-accent/20 text-accent shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            {option.icon}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={chartConfig.processedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey={chartConfig.yAxisKeys[0]}
                                nameKey={chartConfig.xAxisKey}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                animationBegin={0}
                                animationDuration={800}
                            >
                                {chartConfig.processedData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#9CA3AF' }} />
                        </PieChart>
                    ) : chartType === 'area' ? (
                        <AreaChart data={chartConfig.processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(184,252,61,0.06)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(184,252,61,0.1)' }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#9CA3AF' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[index % COLORS.length]}
                                    fill={COLORS[index % COLORS.length]}
                                    fillOpacity={0.2}
                                    strokeWidth={3}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                    animationDuration={1000}
                                />
                            ))}
                        </AreaChart>
                    ) : chartType === 'line' ? (
                        <LineChart data={chartConfig.processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(184,252,61,0.06)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(184,252,61,0.1)' }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#9CA3AF' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#0a0e0a', strokeWidth: 2 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                    animationDuration={1000}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <BarChart data={chartConfig.processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(184,252,61,0.06)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(184,252,61,0.1)' }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(184,252,61, 0.04)' }} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#9CA3AF' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={COLORS[index % COLORS.length]}
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={50}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                    animationDuration={800}
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
