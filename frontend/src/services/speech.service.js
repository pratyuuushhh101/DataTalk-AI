import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// ──────────────────────────────────────────────────────────────────────────────
// Azure Speech Service — Real-time Transcription
// ──────────────────────────────────────────────────────────────────────────────

const SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY || "";
const SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || "centralindia";

export const startTranscription = (onResult) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    speechConfig.speechRecognitionLanguage = "en-IN"; // Supports Indian accent

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
        onResult(e.result.text, false);
    };

    recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            onResult(e.result.text, true);
        }
    };

    recognizer.startContinuousRecognitionAsync();

    return recognizer;
};

export const stopTranscription = (recognizer) => {
    if (recognizer) {
        recognizer.stopContinuousRecognitionAsync();
    }
};

export default {
    startTranscription,
    stopTranscription
};
