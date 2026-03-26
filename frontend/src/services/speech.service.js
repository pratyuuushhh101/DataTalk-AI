import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// ──────────────────────────────────────────────────────────────────────────────
// Azure Speech Service — Real-time Transcription
// ──────────────────────────────────────────────────────────────────────────────

const SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY || "";
const SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || "centralindia";

export const startTranscription = (onResult) => {
    // ── Guard: validate config before SDK init ──
    console.log("[Speech] Key loaded:", SPEECH_KEY ? `${SPEECH_KEY.substring(0, 8)}...✅` : "❌ MISSING");
    console.log("[Speech] Region:", SPEECH_REGION || "❌ MISSING");

    if (!SPEECH_KEY || !SPEECH_KEY.trim()) {
        const msg = "Azure Speech config missing. Set VITE_AZURE_SPEECH_KEY in frontend/.env and restart dev server.";
        console.error(`[Speech] ❌ ${msg}`);
        throw new Error(msg);
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    speechConfig.speechRecognitionLanguage = "en-IN"; // Supports Indian accent

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    // --- DEEP DEBUG LOGGING FOR RECOGNIZER ---
    recognizer.sessionStarted = (s, e) => {
        console.log("[Speech] 🟢 Session started successfully with Azure");
    };

    recognizer.sessionStopped = (s, e) => {
        console.log("[Speech] 🛑 Session stopped. (Could be intentional or an error)");
    };

    recognizer.canceled = (s, e) => {
        console.error(`[Speech] ⚠️ CANCELED: Reason=${e.reason}`);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
            console.error(`[Speech] ❌ Error Code: ${e.errorCode}`);
            console.error(`[Speech] ❌ Error Details: ${e.errorDetails}`);
            console.error("[Speech] 👉 Tip: Network drop, auth issue, or socket closed.");

            // ── Self-Healing: Auto-reconnect on Error ──
            console.log("[Speech] 🔄 Attempting to restart recognizer in 2s...");
            setTimeout(() => {
                try {
                    // Start fresh
                    recognizer.startContinuousRecognitionAsync();
                } catch (err) {
                    console.error("[Speech] ❌ Auto-restart failed:", err);
                }
            }, 2000);
        }
    };

    recognizer.recognizing = (s, e) => {
        const text = e.result.text || "";
        console.log("[Speech] 〰️ Partial transcript:", text === "" ? "<empty string>" : text);
        try {
            onResult(text, false);
        } catch (err) {
            console.error("[Speech] ❌ onResult callback threw an error:", err);
        }
    };

    recognizer.recognized = (s, e) => {
        const text = e.result.text || "";
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            console.log("[Speech] ✅ Final transcript:", text === "" ? "<empty string>" : text);
            try {
                onResult(text, true);
            } catch (err) {
                console.error("[Speech] ❌ onResult callback threw an error:", err);
            }
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
            console.log("[Speech] 🤷‍♂️ NOMATCH: Speech could not be recognized.");
        }
    };

    console.log("[Speech] ⏳ Initiating continuous recognition...");
    recognizer.startContinuousRecognitionAsync(
        () => {
            console.log("[Speech] 🚀 startContinuousRecognitionAsync completed successfully!");
        },
        (err) => {
            console.error("[Speech] ❌ startContinuousRecognitionAsync failed:", err);
        }
    );

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
