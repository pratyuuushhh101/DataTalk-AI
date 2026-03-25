const axios = require('axios');
const FormData = require('form-data');

const {
    AZURE_OPENAI_WHISPER_KEY,
    AZURE_OPENAI_WHISPER_ENDPOINT,
    AZURE_OPENAI_WHISPER_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION
} = process.env;

/**
 * Transcribes an audio buffer natively using Azure OpenAI's Whisper Engine.
 * Blackbox auto-detects 57 languages flawlessly with zero metadata required.
 * 
 * @param {Buffer} audioBuffer - The downloaded raw audio buffer from Twilio.
 * @returns {Promise<string>} - The brilliantly translated/transcribed text output.
 */
async function transcribeAudio(audioBuffer) {
    const cleanKey = (AZURE_OPENAI_WHISPER_KEY || "").trim();
    const cleanEndpoint = (AZURE_OPENAI_WHISPER_ENDPOINT || "").trim();
    const cleanDeployment = (AZURE_OPENAI_WHISPER_DEPLOYMENT || "").trim();
    const cleanVersion = (AZURE_OPENAI_API_VERSION || "2024-06-01").trim();

    const baseUrl = cleanEndpoint.endsWith('/') ? cleanEndpoint : `${cleanEndpoint}/`;
    const url = `${baseUrl}openai/deployments/${cleanDeployment}/audio/transcriptions?api-version=${cleanVersion}`;

    console.log(`[Whisper] Sending voice buffer (${Math.round(audioBuffer.length / 1024)}KB) to: ${url}`);

    const formData = new FormData();
    // Provide a generic filename with an extension Whisper handles (.ogg from Twilio)
    formData.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });

    try {
        const response = await axios.post(url, formData, {
            headers: {
                'api-key': cleanKey,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        // Parse the response from Whisper
        return response.data.text || "";
    } catch (err) {
        console.error("Azure OpenAI Whisper Error Status:", err.response?.status);
        console.error("Azure OpenAI Whisper Error Body:", JSON.stringify(err.response?.data) || err.message);
        throw new Error("Failed to transcribe via Azure Whisper Engine");
    }
}

module.exports = { transcribeAudio };
