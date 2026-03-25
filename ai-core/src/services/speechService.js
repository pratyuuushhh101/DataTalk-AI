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

async function transcribeAudio(filePath) {
  let wavPath = null;

  try {
    // 1. Convert uploaded file (webm/ogg/etc.) to WAV
    wavPath = await convertToWav(filePath);

    return await new Promise((resolve, reject) => {
      // 2. Setup Translation Config
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
      );

      // Target language is English
      translationConfig.addTargetLanguage("en-US");

      // 3. Setup Auto-Detect for Source Language (Major Indian Languages)
      const autoDetectSourceLanguageConfig = sdk.AutoDetectSourceLanguageConfig.fromLanguages([
        "en-IN", // English (India)
        "hi-IN", // Hindi
        "kn-IN", // Kannada
        "bn-IN"  // Bengali
      ]);

      // 4. Read the converted WAV file via push stream with correct format
      const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      const pushStream = sdk.AudioInputStream.createPushStream(format);

      const audioBuffer = fs.readFileSync(wavPath);
      // Skip the 44-byte WAV header so we push only raw PCM data
      const pcmData = audioBuffer.slice(44);
      pushStream.write(pcmData);
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // 5. Create Translation Recognizer
      const recognizer = sdk.TranslationRecognizer.FromConfig(
        translationConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
      );

      recognizer.recognizeOnceAsync(result => {
        recognizer.close();

        if (result.reason === sdk.ResultReason.TranslatedSpeech) {
          // Retrieve the english translation
          const englishTranslation = result.translations.get("en-US") || result.text;
          console.log("[Speech] Translated:", englishTranslation);
          resolve(englishTranslation);
        } else if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          // Fallback to recognized text if translation didn't trigger
          console.log("[Speech] Recognized (no translation):", result.text);
          resolve(result.text);
        } else {
          console.error("[Speech] Recognition failed:", result.errorDetails);
          reject(result.errorDetails || "Translation Failed or Audio empty");
        }
      });
    });
  } finally {
    // Clean up the converted WAV file
    if (wavPath && fs.existsSync(wavPath)) {
      try { fs.unlinkSync(wavPath); } catch (_) { /* ignore cleanup errors */ }
    }
  }
}

module.exports = { transcribeAudio };