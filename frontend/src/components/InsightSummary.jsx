import React, { useMemo, useState, useEffect } from 'react';
import Card from './Card';
import { Sparkles, ChevronRight, Globe, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'bn', label: 'Bengali', flag: '🇮🇳' }
];

/** Detect what language a block of text likely is */
const detectLanguage = (text) => {
    if (!text) return 'en';
    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;
    if (bengaliRegex.test(text)) return 'bn';
    if (hindiRegex.test(text)) return 'hi';
    return 'en';
};

/** Parse raw markdown-formatted text into clean readable lines */
const formatInsightText = (text) => {
    if (!text) return [];

    return text
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && l !== '---') // Skip horizontal lines
        .map(line => {
            line = line.replace(/^#{1,4}\s*/, '');
            line = line.replace(/^Part\s*\d+\s*[:\-–]\s*/i, '');
            line = line.replace(/^Insight\s+in\s+\w+\s*[:\-–]?\s*/i, '');
            line = line.replace(/^\*{0,2}\s*(English|Hindi|Kannada|Bengali)\s*\*{0,2}\s*[:\-–]?\s*$/i, '');
            line = line.trim();
            if (!line) return null;

            const isBullet = /^[*\-•]/.test(line);
            if (isBullet) {
                line = line.replace(/^[*\-•]\s*/, '');
            }
            if (!line) return null;

            return { text: line, isBullet };
        })
        .filter(Boolean);
};

const extractSections = (rawInsight) => {
    if (!rawInsight) return { en: '', hi: '', bn: '' };

    const sections = { en: [], hi: [], bn: [] };
    const rawBlocks = rawInsight.replace(/\r/g, '').split(/\n/);

    let currentLang = 'en'; // default
    let hasExplicitHeader = false;

    for (let line of rawBlocks) {
        const lineTrim = line.trim();
        if (!lineTrim || lineTrim === '---') continue;

        const lower = lineTrim.toLowerCase();

        // Catch headers like "### ENGLISH", "ENGLISH INSIGHT", "**HINDI**"
        if (lower.includes('english') && lineTrim.length <= 35) { currentLang = 'en'; hasExplicitHeader = true; continue; }
        if (lower.includes('hindi') && lineTrim.length <= 35) { currentLang = 'hi'; hasExplicitHeader = true; continue; }
        if (lower.includes('bengali') && lineTrim.length <= 35) { currentLang = 'bn'; hasExplicitHeader = true; continue; }

        // Script-based detection if we haven't hit a header or if script changes
        const detected = detectLanguage(lineTrim);
        if (detected !== 'en' && (!hasExplicitHeader || detected !== currentLang)) {
            currentLang = detected;
        }

        sections[currentLang].push(lineTrim);
    }

    return {
        en: sections.en.join('\n'),
        hi: sections.hi.join('\n'),
        bn: sections.bn.join('\n')
    };
};

/** Render bold markdown within a line */
const RenderLine = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-gray-100 font-semibold">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

const InsightSummary = ({ insight, questionLanguage }) => {
    const sections = useMemo(() => extractSections(insight), [insight]);
    const [activeLang, setActiveLang] = useState('en');
    const [showSelector, setShowSelector] = useState(false);
    const [lastInsight, setLastInsight] = useState('');

    // Effect to set initial language based on question or content
    useEffect(() => {
        if (insight && insight !== lastInsight) {
            setLastInsight(insight);
            const firstNonEmpty = Object.keys(sections).find(k => sections[k].length > 0);
            if (questionLanguage && sections[questionLanguage]) {
                setActiveLang(questionLanguage);
            } else if (firstNonEmpty) {
                setActiveLang(firstNonEmpty);
            }
        }
    }, [insight, sections, questionLanguage, lastInsight]);

    const lines = useMemo(
        () => formatInsightText(sections[activeLang]),
        [sections, activeLang]
    );

    if (!insight || (sections.en.length === 0 && sections.hi.length === 0 && sections.bn.length === 0)) return null;

    const currentLangObj = LANGUAGES.find(l => l.code === activeLang) || LANGUAGES[0];

    return (
        <Card className="mb-6 bg-gradient-to-br from-accent/5 via-card-bg to-accent/3 border-accent/15 animate-fade-in-up animate-glow-pulse overflow-visible relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                    <div className="bg-accent/10 p-2 rounded-xl shadow-sm shadow-accent/10">
                        <Sparkles className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center space-x-1.5">
                            <span>AI Insight</span>
                            <span className="inline-block w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                        </h3>
                    </div>
                </div>

                {/* Inline Language Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowSelector(!showSelector)}
                        className="flex items-center space-x-2 bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-accent/20"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{currentLangObj.flag} {currentLangObj.label}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {showSelector && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSelector(false)}
                            />
                            <div className="absolute right-0 mt-2 w-40 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-zoom-in">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setActiveLang(lang.code);
                                            setShowSelector(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors hover:bg-white/5
                                            ${activeLang === lang.code ? 'text-accent bg-accent/5' : 'text-gray-400'}
                                        `}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span>{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </div>
                                        {activeLang === lang.code && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Insight Content */}
            <div className="space-y-2.5 animate-fade-in" key={activeLang}>
                {lines.length > 0 ? (
                    lines.map((line, idx) => (
                        <div
                            key={idx}
                            className={`text-[14px] leading-relaxed text-gray-300 ${line.isBullet ? 'flex items-start space-x-2 pl-2' : ''
                                }`}
                            style={{ animationDelay: `${idx * 30}ms` }}
                        >
                            {line.isBullet && (
                                <ChevronRight className="w-3.5 h-3.5 text-accent mt-1 shrink-0" />
                            )}
                            <span>
                                <RenderLine text={line.text} />
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 italic">No insight available in {currentLangObj.label}. Try switching language.</p>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-accent/10 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    Multilingual Analysis Active
                </span>
            </div>
        </Card>
    );
};

export default InsightSummary;
