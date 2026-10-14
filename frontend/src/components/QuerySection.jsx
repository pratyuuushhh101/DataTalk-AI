import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CornerDownLeft, Loader, Mic, Square, Terminal } from 'lucide-react';

const AI_CORE_URL = import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8000';

const LANG_LABELS = {
    en: 'EN',
    hi: 'HI',
    bn: 'BN'
};

const QUICK_PROMPTS = [
    'Top 5 products by revenue',
    'Monthly revenue trend',
    'Total profit by region',
    'ম্যাগি থেকে মোট কত লাভ হয়েছে?',
    'South region me kitna profit hua?'
];

const QuerySection = ({ uploaded, loading, question, setQuestion, onSubmit }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState(null);
    const [voiceError, setVoiceError] = useState(null);
    const [detectedBadge, setDetectedBadge] = useState(null);

    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const maxRecordTimerRef = useRef(null);

    const isButtonDisabled = !uploaded || loading || isRecording || !question.trim();

    const cleanupMedia = useCallback(() => {
        if (maxRecordTimerRef.current) {
            clearTimeout(maxRecordTimerRef.current);
            maxRecordTimerRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    useEffect(() => () => cleanupMedia(), [cleanupMedia]);

    const submitQuery = useCallback((textToSubmit, detectedLang = null) => {
        if (!textToSubmit || !textToSubmit.trim()) return;
        setVoiceStatus(null);
        setQuestion('');
        onSubmit(textToSubmit.trim(), detectedLang);
    }, [onSubmit, setQuestion]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isButtonDisabled) {
            submitQuery(question);
        }
    };

    const stopRecordingAndTranscribe = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch (e) {}
        }
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        setVoiceError(null);
        setDetectedBadge(null);
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';

            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                cleanupMedia();
                const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                if (audioBlob.size < 1000) {
                    setVoiceStatus(null);
                    return;
                }

                setVoiceStatus('processing');
                try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice.webm');

                    let res = await fetch(`${AI_CORE_URL}/transcribe`, { method: 'POST', body: formData });
                    if (res.status === 404) {
                        res = await fetch(`${AI_CORE_URL}/api/transcribe`, { method: 'POST', body: formData });
                    }

                    const data = await res.json();
                    if (!res.ok || !data.text) throw new Error(data.error || 'Transcription failed');

                    const transcript = data.text.trim();
                    const lang = data.language || 'en';
                    setDetectedBadge(lang);
                    setQuestion(transcript);
                    submitQuery(transcript, lang);
                } catch (err) {
                    setVoiceError(err.message || 'Voice transcription failed');
                    setVoiceStatus('error');
                    setTimeout(() => { setVoiceStatus(null); setVoiceError(null); }, 4000);
                }
            };

            recorder.start();
            setIsRecording(true);
            setVoiceStatus('listening');
            maxRecordTimerRef.current = setTimeout(() => stopRecordingAndTranscribe(), 12000);
        } catch (err) {
            setVoiceError(err.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Microphone unavailable.');
            setVoiceStatus('error');
            setTimeout(() => { setVoiceStatus(null); setVoiceError(null); }, 4000);
        }
    }, [cleanupMedia, setQuestion, stopRecordingAndTranscribe, submitQuery]);

    const toggleRecording = () => {
        if (isRecording) stopRecordingAndTranscribe();
        else startRecording();
    };

    let placeholder = 'Query dataset in English, Hindi, or Bengali...';
    if (!uploaded) placeholder = 'Upload a CSV file to enable querying...';
    else if (voiceStatus === 'listening') placeholder = 'Recording audio (auto-detecting language)... Click stop when finished';
    else if (voiceStatus === 'processing' || loading) placeholder = 'Executing query...';

    return (
        <div
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className="border p-4"
        >
            {/* Input Bar */}
            <div
                style={{
                    backgroundColor: 'var(--dt-bg)',
                    borderColor: isRecording ? '#ef4444' : 'var(--dt-border-strong)',
                    borderRadius: 'var(--dt-radius)'
                }}
                className="flex items-center border px-3 py-2 gap-2.5 transition-colors"
            >
                <Terminal size={15} style={{ color: 'var(--dt-text-faint)' }} className="shrink-0" />

                <input
                    id="query-input"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!uploaded || loading || isRecording || voiceStatus === 'processing'}
                    placeholder={placeholder}
                    style={{ color: 'var(--dt-text)' }}
                    className="w-full bg-transparent text-sm focus:outline-none placeholder:text-zinc-500 disabled:opacity-50"
                />

                {/* Language Status Pill */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {detectedBadge && (
                        <span
                            style={{
                                backgroundColor: 'var(--dt-accent-soft)',
                                color: 'var(--dt-accent)',
                                borderRadius: 'var(--dt-radius)'
                            }}
                            className="px-2 py-0.5 text-[10px] font-mono font-semibold"
                        >
                            DETECTED: {LANG_LABELS[detectedBadge] || 'EN'}
                        </span>
                    )}
                    <span
                        style={{
                            backgroundColor: 'var(--dt-surface-2)',
                            color: 'var(--dt-text-faint)',
                            borderColor: 'var(--dt-border)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="px-2 py-0.5 text-[10px] font-mono border"
                        title="Supported voice & text languages: English, Hindi, Bengali"
                    >
                        EN · HI · BN
                    </span>
                </div>

                {/* Single Auto-Detect Mic Button */}
                <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!uploaded || loading || voiceStatus === 'processing'}
                    style={{
                        backgroundColor: isRecording ? 'rgba(239,68,68,0.15)' : 'var(--dt-surface-2)',
                        color: isRecording ? '#ef4444' : 'var(--dt-text-muted)',
                        borderColor: isRecording ? '#ef4444' : 'var(--dt-border)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="p-2 border transition-colors hover:opacity-90 disabled:opacity-40 shrink-0"
                    title={isRecording ? 'Stop recording & transcribe' : 'Speak in English, Hindi, or Bengali'}
                >
                    {voiceStatus === 'processing' ? (
                        <Loader size={14} className="animate-spin" />
                    ) : isRecording ? (
                        <Square size={14} className="fill-current" />
                    ) : (
                        <Mic size={14} />
                    )}
                </button>

                {/* Run Query Button */}
                <button
                    type="button"
                    onClick={() => submitQuery(question)}
                    disabled={isButtonDisabled}
                    style={{
                        backgroundColor: isButtonDisabled ? 'var(--dt-surface-2)' : 'var(--dt-accent)',
                        color: isButtonDisabled ? 'var(--dt-text-faint)' : 'var(--dt-accent-text)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold transition-opacity disabled:cursor-not-allowed shrink-0"
                >
                    {loading ? <Loader size={13} className="animate-spin" /> : <><span>RUN</span><CornerDownLeft size={12} /></>}
                </button>
            </div>

            {/* Error or Quick Sample Queries */}
            {voiceError ? (
                <p className="text-xs text-red-400 font-mono mt-2">{voiceError}</p>
            ) : uploaded && (
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
                    <span style={{ color: 'var(--dt-text-faint)' }} className="text-[10px] font-mono uppercase shrink-0 mr-1">
                        Try:
                    </span>
                    {QUICK_PROMPTS.map((q) => (
                        <button
                            key={q}
                            type="button"
                            disabled={loading || isRecording}
                            onClick={() => submitQuery(q)}
                            style={{
                                backgroundColor: 'var(--dt-surface-2)',
                                borderColor: 'var(--dt-border)',
                                color: 'var(--dt-text-muted)',
                                borderRadius: 'var(--dt-radius)'
                            }}
                            className="px-2 py-0.5 text-[11px] border hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuerySection;
