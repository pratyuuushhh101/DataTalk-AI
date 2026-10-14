import React from 'react';

const Card = ({ title, value, subtitle, trend, trendUp, icon, children, className = '' }) => {
    return (
        <div
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className={`border p-5 transition-colors duration-150 ${className}`}
        >
            {(title || icon) && (
                <div className="flex items-center justify-between mb-2">
                    <h3
                        style={{ color: 'var(--dt-text-muted)' }}
                        className="text-[11px] font-semibold uppercase tracking-wider"
                    >
                        {title}
                    </h3>
                    {icon && (
                        <div style={{ color: 'var(--dt-text-faint)' }}>
                            {icon}
                        </div>
                    )}
                </div>
            )}
            {(value || value === 0) && (
                <div className="flex items-baseline mb-1">
                    <span
                        style={{ color: 'var(--dt-text)' }}
                        className="text-2xl font-semibold tracking-tight font-mono tabular-nums"
                    >
                        {value}
                    </span>
                    {trend && (
                        <span
                            className={`ml-2 text-xs font-mono font-medium flex items-center ${
                                trendUp ? 'text-emerald-500' : 'text-red-500'
                            }`}
                        >
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            )}
            {subtitle && (
                <p style={{ color: 'var(--dt-text-faint)' }} className="text-xs mt-1">
                    {subtitle}
                </p>
            )}
            {children && <div className={title || value ? 'mt-4' : ''}>{children}</div>}
        </div>
    );
};

export default Card;
