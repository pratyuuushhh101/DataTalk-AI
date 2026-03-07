import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader, Lock, Mic, MicOff, CheckCircle, Globe, ChevronDown, Check } from 'lucide-react';
import Card from './Card';

const LANGUAGES = [
    { code: 'en-IN', label: 'English', flag: '🇬🇧', id: 'en' },
    { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳', id: 'hi' },
    { code: 'bn-IN', label: 'Bengali', flag: '🇮🇳', id: 'bn' }
];

const QuerySection = ({ uploaded, loading, question, setQuestion, onSubmit }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState(null);
    const [voiceError, setVoiceError] = useState(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [speakingLang, setSpeakingLang] = useState(LANGUAGES[0]);
    const [showLangMenu, setShowLangMenu] = useState(false);

    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const finalTranscriptRef = useRef('');

    const isButtonDisabled = !uploaded || loading || (!question.trim() && !interimTranscript.trim() && !finalTranscriptRef.current.trim());

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // ignore
            }
        }
        setIsRecording(false);
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => stopRecording();
    }, [stopRecording]);

    const displayValue = isRecording ? finalTranscriptRef.current + interimTranscript : question;

    const submitQuery = useCallback((textToSubmit) => {
        if (!textToSubmit.trim()) return;
        stopRecording();
        setVoiceStatus(null);
        finalTranscriptRef.current = '';
        setInterimTranscript('');
        setQuestion('');
        onSubmit(textToSubmit);
    }, [stopRecording, onSubmit, setQuestion]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isButtonDisabled) {
            submitQuery(displayValue);
        }
    };

    const startRecording = useCallback(() => {
        setVoiceError(null);
        finalTranscriptRef.current = '';
        setInterimTranscript('');
        setQuestion('');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setVoiceError("Voice input works best in Chrome or Edge");
            setVoiceStatus('error');
            setTimeout(() => { setVoiceStatus(null); setVoiceError(null); }, 4000);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.language = speakingLang.code;

        const startSilenceTimer = (currentFullText) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (currentFullText.trim().length > 0) {
                    stopRecording();
                    submitQuery(currentFullText);
                } else {
                    stopRecording();
                    setVoiceStatus(null);
                }
            }, 4500);
        };

        recognition.onstart = () => {
            setIsRecording(true);
            setVoiceStatus('listening');
            startSilenceTimer('');
        };

        recognition.onresult = (event) => {
            let interim = '';
            let finalPart = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalPart += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }
            if (finalPart) {
                finalTranscriptRef.current += finalPart;
            }
            const currentFullText = finalTranscriptRef.current + interim;
            setInterimTranscript(interim);
            setQuestion(currentFullText);
            startSilenceTimer(currentFullText);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                setVoiceError(event.error === 'not-allowed' ? 'Microphone access denied.' : event.error);
                setVoiceStatus('error');
                setTimeout(() => { setVoiceStatus(null); setVoiceError(null); }, 4000);
            }
            stopRecording();
            setVoiceStatus(null);
        };

        recognition.onend = () => {
            setIsRecording(false);
            setVoiceStatus((prev) => prev === 'listening' ? null : prev);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recognition', e);
        }
    }, [setQuestion, stopRecording, submitQuery, speakingLang]);

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
            if (displayValue.trim().length > 0) {
                submitQuery(displayValue);
            } else {
                setVoiceStatus(null);
            }
        } else {
            startRecording();
        }
    };

    let computedPlaceholder = "Ask a question about your data...";
    if (voiceStatus === 'listening') {
        computedPlaceholder = `Listening in ${speakingLang.label}...`;
    } else if (voiceStatus === 'processing' || loading) {
        computedPlaceholder = "Analyzing your data...";
    }

    return (
        <Card className={`relative transition-all duration-300 ${!uploaded ? 'opacity-60' : ''}`}>
            {!uploaded && (
                <div className="absolute inset-0 bg-background/60 z-10 rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
                    <div className="flex items-center space-x-2 text-gray-400 bg-surface px-4 py-2 rounded-full shadow-sm border border-accent/10">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Upload a dataset first</span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className={`step-circle ${!uploaded ? 'inactive' : 'active'}`}>2</div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-200">Ask a Question</h3>
                        <p className="text-xs text-gray-500">Type or speak in any language</p>
                    </div>
                </div>

                {/* Voice Language Toggle */}
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-lg border border-white/10 transition-colors text-[10px] font-bold uppercase tracking-wider"
                    >
                        <span>{speakingLang.flag}</span>
                        <span>{speakingLang.id}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showLangMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                            <div className="absolute right-0 mt-1 w-32 bg-[#1a1a1c] border border-white/10 rounded-lg shadow-2xl z-20 overflow-hidden py-1 animate-zoom-in">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => {
                                            setSpeakingLang(lang);
                                            setShowLangMenu(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-white/5
                                            ${speakingLang.id === lang.id ? 'text-accent bg-accent/5' : 'text-gray-400'}
                                        `}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span>{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </div>
                                        {speakingLang.id === lang.id && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col">
                {voiceStatus && voiceStatus !== 'listening' && (
                    <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 animate-fade-in ${voiceStatus === 'processing' ? 'bg-yellow-900/30 text-yellow-400' :
                        voiceStatus === 'success' ? 'bg-accent/10 text-accent' :
                            'bg-red-900/30 text-red-400'
                        }`}>
                        {voiceStatus === 'processing' && (
                            <>
                                <Loader className="w-3 h-3 animate-spin" />
                                <span>Processing...</span>
                            </>
                        )}
                        {voiceStatus === 'error' && (
                            <span>{voiceError || 'Voice error'}</span>
                        )}
                    </div>
                )}

                <div className="relative flex items-center w-full">
                    <input
                        id="query-input"
                        type="text"
                        value={displayValue}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                            if (silenceTimerRef.current) {
                                clearTimeout(silenceTimerRef.current);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={!uploaded || loading || isRecording}
                        placeholder={computedPlaceholder}
                        className="w-full pl-4 pr-[11rem] py-3.5 rounded-xl border border-white/5 bg-[#141416] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50 text-gray-200 shadow-sm transition-all text-sm placeholder:text-gray-500 font-medium disabled:opacity-80"
                    />

                    <div className="absolute right-1.5 flex items-center gap-2">
                        {isRecording && !loading && (
                            <div className="flex items-center justify-center gap-[2px] h-6 px-1 pr-2">
                                <div className="w-1 bg-accent rounded-full animate-wave-bars h-3" style={{ animationDelay: '0ms' }} />
                                <div className="w-1 bg-accent rounded-full animate-wave-bars h-5" style={{ animationDelay: '150ms' }} />
                                <div className="w-1 bg-accent rounded-full animate-wave-bars h-3" style={{ animationDelay: '300ms' }} />
                                <div className="w-1 bg-accent rounded-full animate-wave-bars h-6" style={{ animationDelay: '450ms' }} />
                            </div>
                        )}

                        <div className="relative flex items-center justify-center min-w-[36px]">
                            {loading || voiceStatus === 'processing' ? (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="relative flex h-5 w-5">
                                        <span className="animate-ripple absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-5 w-5 bg-accent/20 flex items-center justify-center border border-accent/50">
                                            <Loader className="w-3 h-3 text-accent animate-spin" />
                                        </span>
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={toggleRecording}
                                    disabled={!uploaded || loading}
                                    className={`p-2 rounded-lg transition-all duration-200 z-10 ${isRecording
                                        ? 'bg-accent/20 text-accent ring-1 ring-accent/50 shadow-[0_0_15px_rgba(181,255,125,0.4)]'
                                        : uploaded
                                            ? 'text-gray-500 hover:text-accent hover:bg-accent/10'
                                            : 'text-gray-700 cursor-not-allowed'
                                        }`}
                                    title={`Start voice input in ${speakingLang.label}`}
                                >
                                    {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => submitQuery(displayValue)}
                            disabled={isButtonDisabled}
                            className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 z-10
                                ${isButtonDisabled
                                    ? 'bg-gray-800 cursor-not-allowed text-gray-600'
                                    : 'bg-gradient-to-r from-accent to-accent-dim text-background hover:shadow-md hover:shadow-accent/20 active:scale-95'
                                }`}
                        >
                            <span className="mr-1.5">Ask</span>
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2 px-1">
                    <p className="text-[10px] text-gray-600">
                        Powered by Azure OpenAI · Read-only queries safely executed
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default QuerySection;
