import React, { useMemo, useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

const LANGUAGES = [
    { code: 'en', label: 'EN', full: 'English' },
    { code: 'hi', label: 'हिं', full: 'Hindi' },
    { code: 'bn', label: 'বাং', full: 'Bengali' }
];

const detectLanguage = (text) => {
    if (!text) return 'en';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    return 'en';
};

const formatInsightText = (text) => {
    if (!text) return [];
    return text
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l !== '---')
        .map((line) => {
            if (/^#{1,4}\s*(english|hindi|bengali)/i.test(line)) return null;
            line = line.replace(/^#{1,4}\s*/, '');
            line = line.replace(/^Part\s*\d+\s*[:\-–]\s*/i, '');
            line = line.replace(/^Insight\s+in\s+\w+\s*[:\-–]?\s*/i, '');
            line = line.trim();
            if (!line) return null;

            const isBullet = /^[*\-•]/.test(line);
            if (isBullet) line = line.replace(/^[*\-•]\s*/, '');
            if (!line) return null;

            return { text: line, isBullet };
        })
        .filter(Boolean);
};

const extractSections = (rawInsight) => {
    if (!rawInsight) return { en: '', hi: '', bn: '' };
    const sections = { en: [], hi: [], bn: [] };
    const rawBlocks = rawInsight.replace(/\r/g, '').split(/\n/);
    let currentLang = 'en';

    for (let line of rawBlocks) {
        const lineTrim = line.trim();
        if (!lineTrim || lineTrim === '---') continue;
        const lower = lineTrim.toLowerCase();

        if (/^#{1,4}\s*english/i.test(lineTrim) || lower === '**english**' || lower === 'english:') { currentLang = 'en'; continue; }
        if (/^#{1,4}\s*hindi/i.test(lineTrim) || lower === '**hindi**' || lower === 'hindi:') { currentLang = 'hi'; continue; }
        if (/^#{1,4}\s*bengali/i.test(lineTrim) || lower === '**bengali**' || lower === 'bengali:') { currentLang = 'bn'; continue; }

        const detected = detectLanguage(lineTrim);
        if (detected !== 'en' && detected !== currentLang) currentLang = detected;

        sections[currentLang].push(lineTrim);
    }

    return {
        en: sections.en.join('\n'),
        hi: sections.hi.join('\n'),
        bn: sections.bn.join('\n')
    };
};

const RenderLine = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} style={{ color: 'var(--dt-text)' }} className="font-semibold">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

const InsightSummary = ({ insight, questionLanguage, className = '' }) => {
    const sections = useMemo(() => extractSections(insight), [insight]);
    const [activeLang, setActiveLang] = useState(questionLanguage || 'en');

    // Sync active tab immediately whenever a new insight arrives OR questionLanguage changes
    useEffect(() => {
        if (!insight) return;
        if (questionLanguage && sections[questionLanguage] && sections[questionLanguage].length > 0) {
            setActiveLang(questionLanguage);
        } else {
            const firstNonEmpty = Object.keys(sections).find((k) => sections[k].length > 0);
            if (firstNonEmpty) setActiveLang(firstNonEmpty);
        }
    }, [insight, questionLanguage, sections]);

    const lines = useMemo(() => formatInsightText(sections[activeLang]), [sections, activeLang]);

    if (!insight || (sections.en.length === 0 && sections.hi.length === 0 && sections.bn.length === 0)) return null;

    return (
        <div
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className={`border p-5 flex flex-col justify-between ${className}`}
        >
            <div>
                <div
                    style={{ borderColor: 'var(--dt-border)' }}
                    className="flex items-center justify-between pb-3 mb-4 border-b"
                >
                    <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: 'var(--dt-accent)' }} />
                        <span
                            style={{ color: 'var(--dt-text)' }}
                            className="text-xs font-semibold uppercase tracking-wider"
                        >
                            Executive Brief
                        </span>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'var(--dt-surface-2)',
                            borderColor: 'var(--dt-border)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="flex items-center p-0.5 border"
                    >
                        {LANGUAGES.map((lang) => {
                            const active = activeLang === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => setActiveLang(lang.code)}
                                    title={lang.full}
                                    style={{
                                        backgroundColor: active ? 'var(--dt-accent)' : 'transparent',
                                        color: active ? 'var(--dt-accent-text)' : 'var(--dt-text-muted)',
                                        borderRadius: 'calc(var(--dt-radius) - 2px)'
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-mono font-medium transition-colors"
                                >
                                    {lang.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2.5">
                    {lines.length > 0 ? (
                        lines.map((line, idx) => (
                            <div
                                key={idx}
                                style={{ color: 'var(--dt-text-muted)' }}
                                className="text-[13px] leading-relaxed flex items-start gap-2.5"
                            >
                                <span
                                    style={{ color: 'var(--dt-accent)' }}
                                    className="font-mono text-xs mt-0.5 select-none"
                                >
                                    —
                                </span>
                                <div className="flex-1">
                                    <RenderLine text={line.text} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: 'var(--dt-text-faint)' }} className="text-xs italic">
                            Summary not available in this language.
                        </p>
                    )}
                </div>
            </div>

            <div
                style={{ borderColor: 'var(--dt-border)', color: 'var(--dt-text-faint)' }}
                className="mt-4 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono"
            >
                <span>QUERY LANG: {(questionLanguage || activeLang).toUpperCase()}</span>
                <span>EN · HI · BN AVAILABLE</span>
            </div>
        </div>
    );
};

export default InsightSummary;
