import React from 'react';

const Card = ({ title, value, subtitle, trend, trendUp, icon, children, className = '' }) => {
    return (
        <div className={`bg-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-card-border p-5 hover:border-card-hover-border hover:shadow-[0_0_20px_rgba(202,255,102,0.06)] transition-all duration-300 ${className}`}>
            {(title || icon) && (
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        {title}
                    </h3>
                    {icon && (
                        <div className="text-accent opacity-60">
                            {icon}
                        </div>
                    )}
                </div>
            )}
            {(value || value === 0) && (
                <div className="flex items-baseline mb-1">
                    <span className="text-3xl font-bold text-gray-100">{value}</span>
                    {trend && (
                        <span
                            className={`ml-2 text-sm font-medium flex items-center ${trendUp ? 'text-accent' : 'text-red-400'
                                }`}
                        >
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            )}
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            {children && <div className="mt-4">{children}</div>}
        </div>
    );
};

export default Card;
