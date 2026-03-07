import React from 'react';

const Card = ({ title, value, subtitle, trend, trendUp, children, className = '' }) => {
    return (
        <div className={`bg-card-bg rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
            {title && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {title}
                </h3>
            )}
            {(value || value === 0) && (
                <div className="flex items-baseline mb-1">
                    <span className="text-3xl font-bold text-gray-900">{value}</span>
                    {trend && (
                        <span
                            className={`ml-2 text-sm font-medium flex items-center ${trendUp ? 'text-green-600' : 'text-red-500'
                                }`}
                        >
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            )}
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            {children && <div className="mt-4">{children}</div>}
        </div>
    );
};

export default Card;
