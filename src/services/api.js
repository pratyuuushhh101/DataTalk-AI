import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AI_CORE_URL = import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// --- REAL FILE UPLOAD FUNCTION ---
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;

    } catch (error) {
        console.error("Upload error:", error);
        throw new Error(
            error.response?.data?.error ||
            'File upload failed. Ensure backend is reachable.'
        );
    }
};

// --- REAL NL QUERY FUNCTION ---
export const runQuery = async (question) => {
    try {
        const response = await api.post('/nl-query', { question });

        const { generatedSQL, data, insight } = response.data;

        if (typeof generatedSQL === 'undefined' || !Array.isArray(data)) {
            throw new Error("Invalid response format received from backend.");
        }

        return {
            sql: generatedSQL,
            data,
            insight
        };

    } catch (error) {
        console.error("Query error:", error);
        throw new Error(
            error.response?.data?.error ||
            'Failed to analyze data. Ensure backend is reachable.'
        );
    }
};

// --- SPEECH-TO-TEXT FUNCTION ---
export const sendSpeech = async (audioBlob) => {
    // Derive file extension from blob MIME type
    const mimeToExt = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mp4': 'mp4' };
    const ext = mimeToExt[audioBlob.type?.split(';')[0]] || 'webm';
    const fileName = `recording.${ext}`;

    console.log('[Speech API] Sending audio — size:', audioBlob.size, 'bytes, type:', audioBlob.type, 'as:', fileName);

    const formData = new FormData();
    formData.append('audio', audioBlob, fileName);

    try {
        // Do NOT set Content-Type manually — the browser must set the
        // multipart boundary automatically, otherwise the request is malformed.
        const response = await axios.post(`${AI_CORE_URL}/api/speech`, formData, {
            timeout: 30000
        });

        console.log('[Speech API] Response:', response.data);
        return response.data; // { text: "transcribed question" }
    } catch (error) {
        console.error('[Speech API] Error:', error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error ||
            'Speech recognition failed. Ensure AI Core is running.'
        );
    }
};

export default api;