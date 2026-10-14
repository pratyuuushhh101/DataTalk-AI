import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#059669', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

const CHART_OPTIONS = [
    { id: 'bar', label: 'Bar' },
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
    { id: 'pie', label: 'Distribution' },
];

const ChartSection = ({ data, className = '' }) => {
    const [chartType, setChartType] = useState('bar');

    useEffect(() => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        const categoricalKeys = keys.filter((key) => typeof data[0][key] === 'string' && !key.toLowerCase().includes('date'));
        const numericKeys = keys.filter((key) => typeof data[0][key] === 'number');

        if (categoricalKeys.length === 1 && numericKeys.length === 1 && data.length <= 6 && data.length > 1) {
            setChartType('pie');
        } else {
            setChartType('bar');
        }
    }, [data]);

    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        const keys = Object.keys(data[0]);
        const categoricalKeys = keys.filter((key) => typeof data[0][key] === 'string' && !key.toLowerCase().includes('date'));
        const temporalKeys = keys.filter((key) => typeof data[0][key] === 'string' && key.toLowerCase().includes('date'));
        const numericKeys = keys.filter((key) => typeof data[0][key] === 'number' && key.toLowerCase() !== 'id');

        if (numericKeys.length === 0) return null;

        let xAxisKey = 'id';
        let processedData = data;

        if (temporalKeys.length > 0) {
            xAxisKey = temporalKeys[0];
        } else if (categoricalKeys.length > 0) {
            xAxisKey = categoricalKeys[0];
        } else if (data.length === 1) {
            processedData = [{ label: 'Total', ...data[0] }];
            xAxisKey = 'label';
        } else {
            processedData = data.map((d, i) => ({ ...d, index: `#${i + 1}` }));
            xAxisKey = 'index';
        }

        const yAxisKeys = numericKeys.slice(0, 2);
        return { xAxisKey, yAxisKeys, processedData };
    }, [data]);

    if (!data || data.length === 0 || !chartConfig) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload) return null;
        return (
            <div
                style={{
                    backgroundColor: 'var(--dt-surface)',
                    borderColor: 'var(--dt-border-strong)',
                    borderRadius: 'var(--dt-radius)'
                }}
                className="px-3 py-2 shadow-lg border text-xs font-mono"
            >
                <p style={{ color: 'var(--dt-text)' }} className="font-semibold mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: 'var(--dt-text-muted)' }}>
                        {p.name}:{' '}
                        <span style={{ color: 'var(--dt-text)' }} className="font-semibold">
                            {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
                        </span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className={`border p-5 ${className}`}
        >
            <div
                style={{ borderColor: 'var(--dt-border)' }}
                className="flex items-center justify-between pb-3 mb-4 border-b"
            >
                <span
                    style={{ color: 'var(--dt-text)' }}
                    className="text-xs font-semibold uppercase tracking-wider"
                >
                    Series Breakdown
                </span>

                <div
                    style={{
                        backgroundColor: 'var(--dt-surface-2)',
                        borderColor: 'var(--dt-border)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="flex p-0.5 border"
                >
                    {CHART_OPTIONS.map((option) => {
                        const active = chartType === option.id;
                        return (
                            <button
                                key={option.id}
                                onClick={() => setChartType(option.id)}
                                style={{
                                    backgroundColor: active ? 'var(--dt-accent)' : 'transparent',
                                    color: active ? 'var(--dt-accent-text)' : 'var(--dt-text-muted)',
                                    borderRadius: 'calc(var(--dt-radius) - 2px)'
                                }}
                                className="px-2.5 py-1 text-[11px] font-mono font-medium transition-colors"
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'pie' && chartConfig.processedData.length > 1 ? (
                        <PieChart>
                            <Pie
                                data={chartConfig.processedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={95}
                                paddingAngle={2}
                                dataKey={chartConfig.yAxisKeys[0]}
                                nameKey={chartConfig.xAxisKey}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {chartConfig.processedData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    ) : chartType === 'area' ? (
                        <AreaChart data={chartConfig.processedData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--dt-border)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--dt-border)' }} />
                            <YAxis tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[index % COLORS.length]}
                                    fill={COLORS[index % COLORS.length]}
                                    fillOpacity={0.14}
                                    strokeWidth={2}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                />
                            ))}
                        </AreaChart>
                    ) : chartType === 'line' ? (
                        <LineChart data={chartConfig.processedData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--dt-border)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--dt-border)' }} />
                            <YAxis tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <BarChart data={chartConfig.processedData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--dt-border)" />
                            <XAxis dataKey={chartConfig.xAxisKey} tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--dt-border)' }} />
                            <YAxis tick={{ fill: 'var(--dt-text-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--dt-surface-2)' }} />
                            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                            {chartConfig.yAxisKeys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={index === 0 ? 'var(--dt-accent)' : COLORS[(index + 1) % COLORS.length]}
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={42}
                                    name={key.replace(/_/g, ' ').toUpperCase()}
                                />
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartSection;
