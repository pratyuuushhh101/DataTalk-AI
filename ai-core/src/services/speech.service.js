const axios = require('axios');
const FormData = require('form-data');

const {
    GROQ_API_KEY,
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_WHISPER_KEY,
    AZURE_OPENAI_WHISPER_DEPLOYMENT
} = process.env;

function detectLangFromText(text, whisperLang) {
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    const wl = String(whisperLang || '').toLowerCase();
    if (wl === 'bn' || wl.includes('bengali') || wl.includes('bangla')) return 'bn';
    if (wl === 'hi' || wl.includes('hindi') || wl.includes('urdu') || wl.includes('marathi')) return 'hi';
    // Check common Banglish / Hinglish words if transcribed in Latin script
    const lower = String(text || '').toLowerCase();
    if (/\b(koto|hoyeche|bikri|ponno|shobcheye|laabh|taka|theke)\b/.test(lower)) return 'bn';
    if (/\b(kitna|hua|sabse|zyada|bikने|kya|hai|kul|munafa)\b/.test(lower)) return 'hi';
    return 'en';
}

async function transcribeAudioWithLang(audioBuffer, mimeType = 'audio/webm') {
    const cleanKey = (GROQ_API_KEY || AZURE_OPENAI_WHISPER_KEY || AZURE_OPENAI_KEY || "").trim();
    const rawDeployment = (AZURE_OPENAI_WHISPER_DEPLOYMENT || "").trim();
    const model = (!rawDeployment || rawDeployment === "whisper")
        ? "whisper-large-v3-turbo"
        : rawDeployment;

    const url = "https://api.groq.com/openai/v1/audio/transcriptions";
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';

    const formData = new FormData();
    formData.append('file', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    formData.append('prompt', 'Retail store query in English, हिन्दी (Hindi), or বাংলা (Bengali). Products: Maggi, Parle-G, Amul Milk, Tata Salt, Aashirvaad Atta, Fortune Oil, Red Label Tea.');

    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Authorization': `Bearer ${cleanKey}`,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        const text = (response.data.text || "").trim();
        const language = detectLangFromText(text, response.data.language);
        console.log(`[Whisper Auto-Detect] Lang: ${language} (raw: ${response.data.language}) | Text: "${text}"`);
        return { text, language };
    } catch (err) {
        console.error("Groq Whisper Error Status:", err.response?.status);
        console.error("Groq Whisper Error Body:", JSON.stringify(err.response?.data) || err.message);
        throw new Error("Failed to transcribe via Groq Whisper Engine");
    }
}

async function transcribeAudio(audioBuffer) {
    const result = await transcribeAudioWithLang(audioBuffer);
    return result.text;
}

module.exports = { transcribeAudio, transcribeAudioWithLang, detectLangFromText };
