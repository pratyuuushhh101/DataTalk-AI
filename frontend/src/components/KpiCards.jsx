import React, { useMemo } from 'react';

const QUANTITY_PATTERNS = [
    'quantity', 'qty', 'sold', 'unit', 'units', 'count',
    'stock', 'item', 'items', 'order', 'orders', 'volume',
    'number', 'num', 'pack', 'packs', ' threshold', 'days'
];

const CURRENCY_PATTERNS = [
    'revenue', 'price', 'cost', 'profit', 'amount',
    'income', 'earning', 'spend', 'expense', 'wholesale',
    'mrp', 'rupee', 'inr', 'value', 'turnover'
];

const isCurrencyKey = (key) => {
    const lower = key.toLowerCase();

    // 1. If the column name mentions any quantity/unit/sold/count term, it is NEVER currency
    //    (e.g., "TotalSold", "TotalQuantity", "UnitsSold", "SalesCount")
    if (QUANTITY_PATTERNS.some((q) => lower.includes(q))) {
        return false;
    }

    // 2. Check explicit money terms
    if (CURRENCY_PATTERNS.some((c) => lower.includes(c))) {
        return true;
    }

    // 3. Only treat "sales" or "total" as currency if it's specifically "total_sales" / "sales" without quantity words
    if (lower === 'sales' || lower === 'total_sales' || lower === 'totalsales') {
        return true;
    }

    return false;
};

const formatMetric = (num, key, isAveraged, isPercent) => {
    if (isNaN(num)) return '0';
    if (isPercent) {
        return (num % 1 !== 0 ? num.toFixed(1) : num.toString()) + '%';
    }
    const prefix = isCurrencyKey(key) ? '₹' : '';

    if (isAveraged) {
        return prefix + (num % 1 !== 0 ? num.toFixed(2) : num.toLocaleString('en-IN'));
    }
    return prefix + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const KpiCards = ({ data }) => {
    const kpis = useMemo(() => {
        if (!data || data.length === 0) return [];

        const keys = Object.keys(data[0]);
        const numericKeys = keys.filter(
            (key) => typeof data[0][key] === 'number' && key.toLowerCase() !== 'id'
        );

        if (numericKeys.length === 0) return [];

        return numericKeys.slice(0, 4).map((key) => {
            const lowerKey = key.toLowerCase();
            const isPercent =
                lowerKey.includes('pct') ||
                lowerKey.includes('percent') ||
                lowerKey.includes('margin_pct');

            const isAveraged =
                isPercent ||
                lowerKey.includes('year') ||
                lowerKey.includes('rate') ||
                lowerKey.includes('avg') ||
                lowerKey.includes('average') ||
                lowerKey.includes('unit_price') ||
                lowerKey.includes('unit_cost') ||
                lowerKey.includes('selling_price') ||
                lowerKey.includes('wholesale_price');

            const total = data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
            const finalVal = isAveraged && data.length > 0 ? total / data.length : total;

            // Format clean human-readable title (e.g., "TotalSold" -> "TOTAL SOLD")
            const title = key
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .toUpperCase();

            return {
                id: key,
                label: title,
                sublabel:
                    isAveraged && data.length > 1
                        ? 'Average across rows'
                        : `${data.length} record${data.length > 1 ? 's' : ''}`,
                formattedValue: formatMetric(finalVal, key, isAveraged, isPercent)
            };
        });
    }, [data]);

    if (!data || data.length === 0 || kpis.length === 0) return null;

    return (
        <div
            style={{
                backgroundColor: 'var(--dt-border)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-px border overflow-hidden mb-5"
        >
            {kpis.map((kpi) => (
                <div
                    key={kpi.id}
                    style={{ backgroundColor: 'var(--dt-surface)' }}
                    className="p-4 flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span
                            style={{ color: 'var(--dt-text-muted)' }}
                            className="text-[11px] font-mono uppercase tracking-wider truncate"
                        >
                            {kpi.label}
                        </span>
                    </div>
                    <div
                        style={{ color: 'var(--dt-text)' }}
                        className="text-2xl font-mono font-semibold tracking-tight tabular-nums"
                    >
                        {kpi.formattedValue}
                    </div>
                    <span
                        style={{ color: 'var(--dt-text-faint)' }}
                        className="text-[11px] mt-1"
                    >
                        {kpi.sublabel}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default KpiCards;
