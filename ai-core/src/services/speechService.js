const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

// Point fluent-ffmpeg to the bundled ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Convert any audio file to 16kHz 16-bit mono WAV (PCM) for Azure Speech SDK.
 * @param {string} inputPath - Path to the uploaded audio file (webm, ogg, etc.)
 * @returns {Promise<string>} - Path to the converted WAV file
 */
function convertToWav(inputPath) {
  const outputPath = inputPath + ".wav";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("error", (err) => {
        console.error("[Speech] FFmpeg conversion error:", err.message);
        reject(new Error("Audio conversion failed: " + err.message));
      })
      .on("end", () => {
        console.log("[Speech] Converted to WAV:", outputPath);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

const { classifyIntent } = require("./intent.service.js");
const axios = require("axios");

let edgeMemoryWindow = [];

async function transcribeAudio(filePath) {
  let wavPath = null;
  const collectedTranscripts = [];

  try {
    wavPath = await convertToWav(filePath);

    return await new Promise((resolve, reject) => {
      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
         console.warn("[WARNING] No Azure keys. Stream initializing anyway to fail fast.");
      }

      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY || "dummy",
        process.env.AZURE_SPEECH_REGION || "dummy"
      );
      translationConfig.addTargetLanguage("en-US");

      const autoDetectSourceLanguageConfig = sdk.AutoDetectSourceLanguageConfig.fromLanguages([
        "en-IN", "hi-IN", "kn-IN", "bn-IN"
      ]);

      const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      const pushStream = sdk.AudioInputStream.createPushStream(format);

      const audioBuffer = fs.readFileSync(wavPath);
      const pcmData = audioBuffer.slice(44);
      pushStream.write(pcmData);
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      const recognizer = sdk.TranslationRecognizer.FromConfig(
        translationConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
      );

      // PARTIAL TRANSCRIPT HANDLING
      recognizer.recognizing = (s, e) => {
          if (e.result.reason === sdk.ResultReason.TranslatingSpeech || e.result.reason === sdk.ResultReason.RecognizingSpeech) {
             const partialText = e.result.translations ? (e.result.translations.get("en-US") || e.result.text) : e.result.text;
             if (partialText) {
                 console.log(`[PARTIAL] ${partialText}`);
             }
          }
      };

      // FINAL TRANSCRIPT HANDLING
      recognizer.recognized = (s, e) => {
          if (e.result.reason === sdk.ResultReason.TranslatedSpeech || e.result.reason === sdk.ResultReason.RecognizedSpeech) {
             const finalText = e.result.translations ? (e.result.translations.get("en-US") || e.result.text) : e.result.text;
             if (!finalText) return;

             console.log(`[FINAL] ${finalText}`);

             // 1. Noise Filter: Drop if < 3 meaningful words
             const wordCount = finalText.trim().split(/\\s+/).length;
             if (wordCount < 3) {
                 console.log(`[DROPPED] Transcript too short (< 3 words)`);
                 return;
             }

             // 2. Semantic Edge Parsing
             const { intent, confidence, entities } = classifyIntent(finalText);
             console.log(`[INTENT] ${intent} | ${JSON.stringify(entities)}`);

             // 3. Drop UNKNOWN structurally
             if (intent === "UNKNOWN") {
                 console.log(`[DROPPED] Edge Filter: UNKNOWN Intent.`);
                 return;
             }

             // 4. 7-Second Rolling Dedup Memory Cache
             const now = Date.now();
             edgeMemoryWindow = edgeMemoryWindow.filter(ev => (now - ev.timestamp) <= 7000);

             const isSemanticDup = edgeMemoryWindow.some(ev => 
                 ev.intent === intent && JSON.stringify(ev.entities) === JSON.stringify(entities)
             );

             if (isSemanticDup) {
                 console.log(`[DROPPED] Edge Filter: 7s Semantic Duplicate recognized.`);
                 return;
             }

             edgeMemoryWindow.push({ timestamp: now, intent, entities });

             // 5. Fire successfully filtered SPEECH_EVENT down the pipeline
             const event = {
                 eventId: `speech_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                 timestamp: Date.now(),
                 type: "SPEECH",
                 text: finalText,
                 speaker: "unknown" // rely entirely on intent fallback mechanics
             };

             axios.post('http://localhost:8000/event', event).catch(err => {
                 console.error("[STREAM ERROR] Failed to hit 8000/event:", err.message);
             });
             
             collectedTranscripts.push(finalText);
          }
      };

      recognizer.canceled = (s, e) => {
          console.log(`[STREAM END] Canceled: ${e.reason}`);
          recognizer.stopContinuousRecognitionAsync();
          resolve(collectedTranscripts.join(" "));
      };

      recognizer.sessionStopped = (s, e) => {
          console.log(`[STREAM END] Session stopped.`);
          recognizer.stopContinuousRecognitionAsync();
          resolve(collectedTranscripts.join(" "));
      };

      recognizer.startContinuousRecognitionAsync();
    });
  } finally {
    if (wavPath && fs.existsSync(wavPath)) {
      try { fs.unlinkSync(wavPath); } catch (_) {}
    }
  }
}

module.exports = { transcribeAudio };