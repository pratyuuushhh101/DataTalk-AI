const axios = require('axios');
const FormData = require('form-data');

const {
    GROQ_API_KEY,
    AZURE_OPENAI_KEY,
    AZURE_OPENAI_WHISPER_KEY,
    AZURE_OPENAI_WHISPER_DEPLOYMENT
} = process.env;

/**
 * Transcribes an audio buffer using Groq's Whisper Engine (whisper-large-v3-turbo).
 * 
 * @param {Buffer} audioBuffer - The downloaded raw audio buffer from Twilio.
 * @returns {Promise<string>} - The transcribed text output.
 */
async function transcribeAudio(audioBuffer) {
    const cleanKey = (GROQ_API_KEY || AZURE_OPENAI_WHISPER_KEY || AZURE_OPENAI_KEY || "").trim();
    const rawDeployment = (AZURE_OPENAI_WHISPER_DEPLOYMENT || "").trim();
    const model = (!rawDeployment || rawDeployment === "whisper")
        ? "whisper-large-v3-turbo"
        : rawDeployment;

    const url = "https://api.groq.com/openai/v1/audio/transcriptions";

    console.log(`[Whisper] Sending voice buffer (${Math.round(audioBuffer.length / 1024)}KB) to Groq (${model})`);

    const formData = new FormData();
    formData.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
    formData.append('model', model);

    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Authorization': `Bearer ${cleanKey}`,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        return response.data.text || "";
    } catch (err) {
        console.error("Groq Whisper Error Status:", err.response?.status);
        console.error("Groq Whisper Error Body:", JSON.stringify(err.response?.data) || err.message);
        throw new Error("Failed to transcribe via Groq Whisper Engine");
    }
}

module.exports = { transcribeAudio };
