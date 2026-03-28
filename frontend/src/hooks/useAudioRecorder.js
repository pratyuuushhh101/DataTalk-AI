import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState('');

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const startTimeRef = useRef(null);
    const timerRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const energyRef = useRef({ sum: 0, count: 0 });

    const resetRecording = useCallback(() => {
        setAudioBlob(null);
        setDuration(0);
        setError('');
        chunksRef.current = [];
        energyRef.current = { sum: 0, count: 0 };
    }, []);

    const startRecording = useCallback(async () => {
        try {
            resetRecording();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);

                // Cleanup hardware locks immediately
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close().catch(() => { });
                }
                clearInterval(timerRef.current);
            };

            mediaRecorderRef.current.start(100);
            startTimeRef.current = Date.now();
            setIsRecording(true);

            // Timer & RMS loop
            timerRef.current = setInterval(() => {
                const currentDuration = (Date.now() - startTimeRef.current) / 1000;
                setDuration(currentDuration);

                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteTimeDomainData(dataArray);

                    let sumSquares = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const norm = (dataArray[i] / 128.0) - 1.0;
                        sumSquares += norm * norm;
                    }
                    const rms = Math.sqrt(sumSquares / dataArray.length);
                    energyRef.current.sum += rms;
                    energyRef.current.count += 1;
                }

                if (currentDuration >= 8) {
                    stopRecording(); // Cap at absolute 8s maximum
                }
            }, 100);

        } catch (err) {
            console.error(err);
            setError('Microphone access denied or unavailable.');
            setIsRecording(false);
        }
    }, [resetRecording]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    }, []);

    // Cleanup unmounts
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const validateRecording = useCallback(() => {
        if (duration < 1.5) return { valid: false, reason: "Recording must be at least 1.5 seconds." };
        if (duration > 8) return { valid: false, reason: "Recording exceeded 8 seconds." };
        if (!audioBlob || audioBlob.size === 0) return { valid: false, reason: "No audio captured." };

        const avgEnergy = energyRef.current.sum / Math.max(energyRef.current.count, 1);
        if (avgEnergy < 0.01) return { valid: false, reason: "Audio is too quiet. Please speak louder." };

        return { valid: true, reason: "" };
    }, [duration, audioBlob]);

    return {
        startRecording,
        stopRecording,
        resetRecording,
        isRecording,
        audioBlob,
        duration,
        error,
        validateRecording
    };
}
