const axios = require('axios');
const config = require('./config'); // Needed for Gemini API key

// ──────────────────────────────────────────────
// Chat history & memory management
// ──────────────────────────────────────────────
const chatHistory = new Map();
const MAX_HISTORY = 20;   // store up to 20 messages per chat for context

/**
 * Preloads common slang abbreviations into a chat's history
 * so the AI understands them without being taught.
 */
function preloadSlangKnowledge(chatId) {
    if (!chatHistory.has(chatId)) {
        chatHistory.set(chatId, []);
    }
    const history = chatHistory.get(chatId);

    // Only inject slang if the history is completely empty (first message)
    if (history.length === 0) {
        history.push(
            {
                role: "user",
                parts: [{ text: "Remember these common abbreviations and slang: xcul=school, wyd=what you doing, hmu=hit me up, lol=laugh out loud, brb=be right back, tbh=to be honest, idk=I don't know, afaik=as far as I know, imo=in my opinion, irl=in real life, smh=shaking my head, tfw=that feeling when, fyi=for your information, luh=love, fr=for real, ong=on God, nah=no, yh=yes, u=you, r=are, k=okay, ikr=i know right, wbu=what about you, wdym=what do you mean, tm=tomorrow, l8r=later, sry=sorry, pls=please, thx=thanks, omg=oh my god, ttyl=talk to you later, gn=good night, gm=good morning, cya=see you, wth=what the hell, btw=by the way, idc=i don't care, ily=i love you, wya=where you at" }]
            },
            {
                role: "model",
                parts: [{ text: "Got it! I'll understand these abbreviations in our chat." }]
            }
        );
    }
}

// ──────────────────────────────────────────────
// System instruction (makes the bot friendly & slang‑savvy)
// ──────────────────────────────────────────────
const SYSTEM_INSTRUCTION = {
    role: "user",
    parts: [{
        text: "You are a helpful, friendly WhatsApp assistant. You understand internet slang, abbreviations, and informal language naturally. If you encounter an unfamiliar abbreviation, try to guess its meaning from context. Always reply in a conversational, warm tone. Avoid overly technical language unless asked."
    }]
};

// ──────────────────────────────────────────────
// Axios instance (unchanged)
// ──────────────────────────────────────────────
const api = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    }
});

// ──────────────────────────────────────────────
// API Endpoints
// ──────────────────────────────────────────────
const APIs = {
    // Image Generation (unchanged)
    generateImage: async (prompt) => {
        try {
            const response = await api.get(`https://api.siputzx.my.id/generate?prompt=${encodeURIComponent(prompt)}`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to generate image');
        }
    },

    // AI Chat - Shizo API (unchanged)
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
        if (!apiKey) throw new Error('Gemini API key not set. Add GEMINI_KEY in Render environment variables.');

        // Ensure this chat has slang preloaded
        preloadSlangKnowledge(chatId);

        // Get the chat's history (now contains slang + previous messages)
        if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
        const history = chatHistory.get(chatId);

        // Build contents: system instruction + history + current prompt
        const contents = [
            SYSTEM_INSTRUCTION,
            ...history,
            { role: "user", parts: [{ text: prompt }] }
        ];

        // Latest free Gemini model (as of 2026)
        const model = 'models/gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await axios.post(url, {
                contents: contents,
                generationConfig: {
                    temperature: 0.9,        // more creative = better slang
                    maxOutputTokens: 2048,   // allow longer replies
                    topP: 0.95,
                    topK: 40,
                },
            });

            const data = response.data;
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('No response from Gemini');
            }

            const reply = data.candidates[0].content.parts[0].text;

            // Save both the user message and the bot's reply to history
            history.push(
                { role: "user", parts: [{ text: prompt }] },
                { role: "model", parts: [{ text: reply }] }
            );

            // Trim history if it gets too long
            while (history.length > MAX_HISTORY * 2) {
                history.shift();
            }

            return reply;
        } catch (error) {
            console.error('Gemini API error:', error.response?.data || error.message);
            throw new Error('Failed to get response from Gemini');
        }
    },

    // ── Other APIs (YouTube, Instagram, TikTok, etc.) remain exactly as you had them ──
    // You can paste the rest of your unchanged functions here.
    // (They were not shown in your snippet; keep them as they are.)
};

module.exports = APIs;
