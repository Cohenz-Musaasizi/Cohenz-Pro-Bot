const axios = require('axios');
const config = require('../config');

// ── Chat memory & slang setup ──────────────
const chatHistory = new Map();
const MAX_HISTORY = 20;

function preloadSlangKnowledge(chatId) {
    if (!chatHistory.has(chatId)) {
        chatHistory.set(chatId, []);
    }
    const history = chatHistory.get(chatId);
    if (history.length === 0) {
        history.push(
            {
                role: "user",
                parts: [{ text: "Remember these common abbreviations: xcul=school, wyd=what you doing, hmu=hit me up, lol=laugh out loud, brb=be right back, tbh=to be honest, idk=I don't know, afaik=as far as I know, imo=in my opinion, irl=in real life, smh=shaking my head, tfw=that feeling when, fyi=for your information, luh=love, fr=for real, ong=on God, nah=no, yh=yes, u=you, r=are, k=okay, ikr=i know right, wbu=what about you, wdym=what do you mean, tm=tomorrow, l8r=later, sry=sorry, pls=please, thx=thanks, omg=oh my god, ttyl=talk to you later, gn=good night, gm=good morning, cya=see you, wth=what the hell, btw=by the way, idc=i don't care, ily=i love you, wya=where you at" }]
            },
            {
                role: "model",
                parts: [{ text: "Got it! I'll remember these abbreviations for our conversation." }]
            }
        );
    }
}

// ── Axios instance (unchanged) ────────────
const api = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    }
});

// ── API Endpoints ─────────────────────────
const APIs = {
    // Image generation (unchanged)
    generateImage: async (prompt) => {
        try {
            const response = await api.get(`https://api.siputzx.my.id/generate?prompt=${encodeURIComponent(prompt)}`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to generate image');
        }
    },

    // AI Chat – Shizo API (unchanged)
    chatAI: async (text) => {
        try {
            const response = await api.get(`https://api.shizo.top/ai?prompt=${encodeURIComponent(text)}`);
            if (response.data && response.data.msg) {
                return response.data.msg;
            }
            return null;
        } catch (error) {
            throw new Error('Failed to get AI response');
        }
    },

    // Gemini – with full memory and slang knowledge
    gemini: async (prompt, chatId = 'default') => {
        const apiKey = config.apiKeys.gemini;
        if (!apiKey) throw new Error('Gemini API key not set');

        preloadSlangKnowledge(chatId);

        if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
        const history = chatHistory.get(chatId);

        const system = {
            role: "user",
            parts: [{ text: "You are a helpful WhatsApp bot. Interpret slang, abbreviations, and informal language naturally. If you encounter an unfamiliar abbreviation, try to guess its meaning from context. Always be friendly and conversational." }]
        };

        const contents = [
            system,
            ...history,
            { role: "user", parts: [{ text: prompt }] }
        ];

        const model = 'models/gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await axios.post(url, {
                contents: contents,
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 2048,
                    topP: 0.95,
                    topK: 40,
                },
            });

            const data = response.data;
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!replyText) throw new Error('No response from Gemini');

            history.push(
                { role: "user", parts: [{ text: prompt }] },
                { role: "model", parts: [{ text: replyText }] }
            );

            while (history.length > MAX_HISTORY * 2) {
                history.shift();
            }

            return replyText;

        } catch (error) {
            console.error('Gemini API raw error:', error.response?.data || error.message);
            throw new Error('Failed to get response from Gemini');
        }
    },

    // ── Paste the rest of your other API functions here (YouTube, IG, TikTok, etc.) ──
    // They remain exactly as they were before. Do not modify them.
};

module.exports = APIs;
