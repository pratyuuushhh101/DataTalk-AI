const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");

async function transcribeAudio(filePath) {
  return new Promise((resolve, reject) => {
    // 1. Setup Translation Config
    const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );

    // Target language is English
    translationConfig.addTargetLanguage("en-US");

    // 2. Setup Auto-Detect for Source Language (Major Indian Languages)
    const autoDetectSourceLanguageConfig = sdk.AutoDetectSourceLanguageConfig.fromLanguages([
      "en-IN", // English (India)
      "hi-IN", // Hindi
      "kn-IN", // Kannada
      "bn-IN", // Bengali
      "te-IN", // Telugu
      "ta-IN", // Tamil
      "mr-IN", // Marathi
      "gu-IN", // Gujarati
      "ml-IN"  // Malayalam
    ]);

    // 3. Read Audio File
    const audioBuffer = fs.readFileSync(filePath);
    const pushStream = sdk.AudioInputStream.createPushStream();
    pushStream.write(audioBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    // 4. Create Translation Recognizer
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
        resolve(englishTranslation);
      } else if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        // Fallback to recognized text if translation didn't trigger
        resolve(result.text);
      } else {
        reject(result.errorDetails || "Translation Failed or Audio empty");
      }
    });
  });
}

module.exports = { transcribeAudio };