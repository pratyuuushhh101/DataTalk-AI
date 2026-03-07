import React, { useMemo, useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Percent, Award } from 'lucide-react';
import Card from './Card';

const ICON_MAP = {
    revenue: <IndianRupee className="w-5 h-5" />,
    sales: <IndianRupee className="w-5 h-5" />,
    amount: <IndianRupee className="w-5 h-5" />,
    total: <IndianRupee className="w-5 h-5" />,
    price: <IndianRupee className="w-5 h-5" />,
    cost: <IndianRupee className="w-5 h-5" />,
    profit: <TrendingUp className="w-5 h-5" />,
    margin: <Percent className="w-5 h-5" />,
    quantity: <Award className="w-5 h-5" />,
    count: <Award className="w-5 h-5" />,
};

const GRADIENT_BORDERS = [
    'border-l-4 border-l-accent',
    'border-l-4 border-l-accent-dim',
    'border-l-4 border-l-accent/50',
    'border-l-4 border-l-accent/80',
];

const getIcon = (key) => {
    const lower = key.toLowerCase();
    for (const [pattern, icon] of Object.entries(ICON_MAP)) {
        if (lower.includes(pattern)) return icon;
    }
    return <TrendingUp className="w-5 h-5" />;
};

const formatLargeNumber = (num) => {
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    if (num % 1 !== 0) return num.toFixed(2);
    return num.toLocaleString();
};

const AnimatedNumber = ({ value, formattedValue }) => {
    const [displayVal, setDisplayVal] = useState('0');

    useEffect(() => {
        const numericVal = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        if (isNaN(numericVal)) {
            setDisplayVal(formattedValue);
            return;
        }

        const duration = 800;
        const steps = 30;
        const stepDuration = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
            current++;
            const progress = current / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentNum = numericVal * eased;

            if (current >= steps) {
                setDisplayVal(formattedValue);
                clearInterval(timer);
            } else {
                setDisplayVal(formatLargeNumber(currentNum));
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [value, formattedValue]);

    return <span>{displayVal}</span>;
};

const KpiCards = ({ data }) => {
    const kpis = useMemo(() => {
        if (!data || data.length === 0) return [];

        const keys = Object.keys(data[0]);
        const numericKeys = keys.filter(key => typeof data[0][key] === 'number');

        if (numericKeys.length === 0) return [];

        return numericKeys.map(key => {
            const sum = data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
            const formatted = formatLargeNumber(sum);
            const title = key.replace(/_/g, ' ').toUpperCase();

            return {
                id: key,
                title,
                value: sum,
                formattedValue: formatted,
                icon: getIcon(key)
            };
        }).slice(0, 4);
    }, [data]);

    if (!data || data.length === 0 || kpis.length === 0) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi, idx) => (
                <div
                    key={kpi.id}
                    className={`animate-fade-in-up ${GRADIENT_BORDERS[idx % GRADIENT_BORDERS.length]}`}
                    style={{ animationDelay: `${idx * 100}ms`, opacity: 0, animationFillMode: 'forwards' }}
                >
                    <Card
                        title={kpi.title}
                        icon={kpi.icon}
                        value={<AnimatedNumber value={kpi.value} formattedValue={kpi.formattedValue} />}
                        className="!rounded-l-none"
                    />
                </div>
            ))}
        </div>
    );
};

export default KpiCards;
