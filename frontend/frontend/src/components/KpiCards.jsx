import React, { useMemo } from 'react';
import Card from './Card';

const KpiCards = ({ data }) => {
    // Extract and aggregate KPIs from data array
    const kpis = useMemo(() => {
        if (!data || data.length === 0) return [];

        const keys = Object.keys(data[0]);
        const numericKeys = keys.filter(key => typeof data[0][key] === 'number');

        if (numericKeys.length === 0) return [];

        return numericKeys.map(key => {
            // Sum the values for numeric keys
            const sum = data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

            // Format cleanly (if > 1000, use K/M suffix optionally, but let's just use toLocaleString for now)
            // If it's a float, limit to 2 decimals
            const isFloat = sum % 1 !== 0;
            const formattedValue = isFloat ? sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : sum.toLocaleString();

            // Beautify key name
            const title = key.replace(/_/g, ' ').toUpperCase();

            return {
                id: key,
                title,
                value: formattedValue
            };
        }).slice(0, 4); // Limit to 4 KPI cards visually
    }, [data]);

    if (!data || data.length === 0 || kpis.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {kpis.map((kpi) => (
                <Card
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.value}
                    className="border-t-4 border-t-primary-blue hover:shadow-md transition-shadow"
                />
            ))}
        </div>
    );
};

export default KpiCards;
