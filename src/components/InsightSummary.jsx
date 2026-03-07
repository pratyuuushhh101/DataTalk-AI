import React, { useMemo } from 'react';
import Card from './Card';
import { Sparkles, Globe, ChevronRight } from 'lucide-react';

// Maps navbar language codes → the label the LLM uses as a section header
const CODE_TO_LANG = {
    en: 'english',
    hi: 'hindi',
    bn: 'bengali',
};

// All language labels we look for in the LLM output (lowercase)
const ALL_LANG_LABELS = ['english', 'hindi', 'bengali'];

const LANG_FLAG = { en: '🇬🇧', hi: '🇮🇳', bn: '🇮🇳' };
const LANG_DISPLAY = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

/** Parse raw markdown-formatted text into clean readable lines */
const formatInsightText = (text) => {
    if (!text) return [];

    return text
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
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

const extractLanguageSection = (rawInsight, langCode) => {
    if (!rawInsight) return '';

    const targetLang = (CODE_TO_LANG[langCode] || 'english').toLowerCase();
    const lines = rawInsight.replace(/\r/g, '').split('\n');

    const sections = { english: [], hindi: [], bengali: [] };

    // Regex to detect script types as strong hints
    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;

    let currentLang = 'english'; // Default

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        let switchLang = null;
        let pLine = line; // processed line

        // Check character content first for implicit blocks
        if (bengaliRegex.test(line)) {
            switchLang = 'bengali';
        } else if (hindiRegex.test(line)) {
            switchLang = 'hindi';
        }

        // A strong header detection overriding implicit logic
        const lowerLine = line.toLowerCase();
        const isHeaderCandidate = lowerLine.length < 90 && (
            lowerLine.includes('english') ||
            lowerLine.includes('hindi') ||
            lowerLine.includes('bengali') ||
            lowerLine.includes('हिंदी') ||
            lowerLine.includes('বাংলা')
        );

        if (isHeaderCandidate) {
            // Check if it's formatted like a header or prefix
            // Matches: "**Hindi:**", "1. English Translation:", "### Insight in Bengali"
            const extractHeader = /^(?:\*|#|-|_|\s|\d|\.)*(?:Insights?(?: in)?|Translations?(?: in)?|Results?(?: in)?)?\s*(english|hindi|bengali|हिंदी|हिन्दी|বাংলা)(?:\s+(?:translation|insight))?\s*(?:\*|#|-|_|:|\s)*(.*)$/i;
            const match = line.match(extractHeader);

            if (match) {
                const langMatch = match[1].toLowerCase();
                if (langMatch === 'english') switchLang = 'english';
                else if (langMatch.includes('hind') || langMatch.includes('हिंद')) switchLang = 'hindi';
                else if (langMatch.includes('bengal') || langMatch.includes('বাংল')) switchLang = 'bengali';

                pLine = match[2].trim(); // The rest of the line, if any
            }
        }

        if (switchLang) {
            currentLang = switchLang;
        }

        if (pLine) {
            sections[currentLang].push(pLine);
        }
    }

    // Return exact requested language if available
    if (sections[targetLang] && sections[targetLang].length > 0) {
        return sections[targetLang].join('\n');
    }

    // Fallbacks if target is missing
    if (sections['english'].length > 0) return sections['english'].join('\n');
    if (sections['hindi'].length > 0) return sections['hindi'].join('\n');
    if (sections['bengali'].length > 0) return sections['bengali'].join('\n');

    return rawInsight.trim();
};

/** Render bold markdown within a line */
const RenderLine = ({ text }) => {
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

const InsightSummary = ({ insight, currentLanguage = 'en' }) => {
    const filteredInsight = useMemo(
        () => extractLanguageSection(insight, currentLanguage),
        [insight, currentLanguage]
    );

    const lines = useMemo(
        () => formatInsightText(filteredInsight),
        [filteredInsight]
    );

    if (!insight || lines.length === 0) return null;

    return (
        <Card className="mb-6 bg-gradient-to-br from-accent/5 via-card-bg to-accent/3 border-accent/15 animate-fade-in-up animate-glow-pulse overflow-visible">
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

                {/* Active Language Badge */}
                <div className="flex items-center space-x-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-semibold">
                    <Globe className="w-3 h-3" />
                    <span>{LANG_FLAG[currentLanguage] || '🌐'} {LANG_DISPLAY[currentLanguage] || 'English'}</span>
                </div>
            </div>

            {/* Insight Content */}
            <div className="space-y-2.5 animate-fade-in" key={currentLanguage}>
                {lines.map((line, idx) => (
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
                ))}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-accent/10 flex items-center space-x-1.5 text-[10px] text-gray-500">
                <Globe className="w-3 h-3" />
                <span>Showing insight in {LANG_DISPLAY[currentLanguage] || 'English'} — change language from the navbar</span>
            </div>
        </Card>
    );
};

export default InsightSummary;
