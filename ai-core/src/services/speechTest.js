require("dotenv").config();
const sdk = require("microsoft-cognitiveservices-speech-sdk");

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

// IMPORTANT: Auto-detect Hindi + Kannada + English
speechConfig.speechRecognitionLanguage = "en-IN"; 
// We'll improve this later with auto-detect

const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

console.log("Speak now...");

recognizer.recognizeOnceAsync(result => {
  console.log("Recognized:", result.text);
  recognizer.close();
});