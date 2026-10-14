import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Terminal,
    Database,
    Activity,
    TrendingUp,
    FileBarChart2,
    MessageSquare,
    Compass,
    ArrowUpRight
} from 'lucide-react';

const NAV_GROUPS = [
    {
        label: 'Workspace',
        items: [
            { path: '/datatalk', label: 'Query Workbench', icon: Terminal },
            { path: '/ledger', label: 'Data Ledger', icon: Database },
            { path: '/reports', label: 'Standard Reports', icon: FileBarChart2 },
            { path: '/profit', label: 'Margin & P&L', icon: TrendingUp },
        ]
    },
    {
        label: 'Store Operations',
        items: [
            { path: '/sync', label: 'POS & Counter Sync', icon: Activity },
            { path: '/founder', label: 'Store Planner', icon: Compass },
            { path: '/whatsapp', label: 'WhatsApp Gateway', icon: MessageSquare },
        ]
    }
];

const Sidebar = ({ isCollapsed }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <aside
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)'
            }}
            className={`${isCollapsed ? 'w-16' : 'w-60'} h-screen fixed left-0 top-0 border-r flex flex-col py-5 px-3 z-50 select-none transition-all duration-200`}
        >
            {/* Brand Header */}
            <div className={`flex items-center gap-2.5 mb-8 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                <div
                    style={{
                        backgroundColor: 'var(--dt-accent)',
                        color: 'var(--dt-accent-text)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="w-7 h-7 flex items-center justify-center font-mono font-bold text-xs shrink-0"
                >
                    DT
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span style={{ color: 'var(--dt-text)' }} className="font-semibold text-sm tracking-tight leading-none">
                            DataTalk
                        </span>
                        <span style={{ color: 'var(--dt-text-faint)' }} className="text-[10px] font-mono mt-1">
                            RETAIL BI v2.4
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 flex flex-col gap-6">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        {!isCollapsed && (
                            <div
                                style={{ color: 'var(--dt-text-faint)' }}
                                className="text-[10px] font-mono uppercase tracking-wider mb-2 px-2.5"
                            >
                                {group.label}
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        style={{
                                            backgroundColor: active ? 'var(--dt-accent-soft)' : 'transparent',
                                            color: active ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
                                            borderRadius: 'var(--dt-radius)'
                                        }}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition-colors hover:opacity-100 ${
                                            isCollapsed ? 'justify-center' : ''
                                        }`}
                                    >
                                        <Icon size={15} className="shrink-0" />
                                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Link */}
            <div style={{ borderColor: 'var(--dt-border)' }} className="pt-4 border-t">
                <Link
                    to="/"
                    style={{ color: 'var(--dt-text-faint)' }}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs hover:underline ${
                        isCollapsed ? 'justify-center' : ''
                    }`}
                >
                    {!isCollapsed && <span>Overview Page</span>}
                    <ArrowUpRight size={14} />
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
