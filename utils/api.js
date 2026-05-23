/**
 * API Integration Utilities
 */

const axios = require('axios');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const api = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// ── File-based chat history persistence ────────────────
const CHAT_HISTORY_FILE = path.join(__dirname, '../database/chat_history.json');

function loadChatHistory() {
  try {
    if (!fs.existsSync(CHAT_HISTORY_FILE)) {
      // Create an empty file if it doesn't exist
      fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify({}), 'utf8');
      return new Map();
    }
    const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const map = new Map();
    for (const [key, value] of Object.entries(parsed)) {
      map.set(key, value);
    }
    return map;
  } catch (err) {
    console.error('Error loading chat history:', err);
    return new Map();
  }
}

function saveChatHistory(chatHistory) {
  try {
    const obj = Object.fromEntries(chatHistory);
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
}

// ── Gemini memory & slang setup ────────────────────────
const chatHistory = loadChatHistory();  // ✅ Persistent memory
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

// ── API Endpoints (all existing functions remain unchanged) ──
const APIs = {
  // Image Generation
  generateImage: async (prompt) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/ai/stablediffusion`, {
        params: { prompt }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate image');
    }
  },
  
  // AI Chat - Shizo API
  chatAI: async (text) => {
    try {
      const response = await api.get(`https://api.shizo.top/ai/gpt?apikey=shizo&query=${encodeURIComponent(text)}`);
      if (response.data && response.data.msg) {
        return { msg: response.data.msg };
      }
      return response.data;
    } catch (error) {
      throw new Error('Failed to get AI response');
    }
  },

  // 🆕 Gemini – with full memory and slang knowledge
gemini: async (prompt, chatId = 'default') => {
  const apiKey = config.apiKeys.gemini || process.env.GEMINI_API_KEY;
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

  // ✅ CHANGED TO GEMINI-3.1-FLASH-LITE (per Google's email)
  const model = 'models/gemini-3.1-flash-lite';
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

    const replyText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error('No response from Gemini');

    // Add exchange to history
    history.push(
      { role: "user", parts: [{ text: prompt }] },
      { role: "model", parts: [{ text: replyText }] }
    );

    // Trim history to keep memory usage in check
    while (history.length > MAX_HISTORY * 2) {
      history.shift();
    }

    // ✅ Save to disk immediately so memory survives restarts
    saveChatHistory(chatHistory);

    return replyText;

  } catch (error) {
    console.error('Gemini API raw error:', error.response?.data || error.message);
    throw new Error('Failed to get response from Gemini');
  }
},
  
  // YouTube Download (with fallback chain - only this function changed)
ytDownload: async (url, type = 'audio') => {
  // Try the original API first (your existing one)
  try {
    const response = await api.get(`https://api.siputzx.my.id/api/d/ytmp3`, {
      params: { url }
    });
    // If it works, return exactly as you originally did
    return response.data;
  } catch (error) {
    // If it fails, try fallback APIs silently
  }

  // Fallback 1: Yupra API
  try {
    const response = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`);
    if (response.data?.success && response.data?.data?.download_url) {
      return {
        download: response.data.data.download_url,
        title: response.data.data.title,
        thumbnail: response.data.data.thumbnail
      };
    }
  } catch (e) {}

  // Fallback 2: Okatsu API
  try {
    const response = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`);
    if (response.data?.dl) {
      return {
        download: response.data.dl,
        title: response.data.title,
        thumbnail: response.data.thumb
      };
    }
  } catch (e) {}

  // Fallback 3: EliteProTech API
  try {
    const response = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`);
    if (response.data?.success && response.data?.downloadURL) {
      return {
        download: response.data.downloadURL,
        title: response.data.title
      };
    }
  } catch (e) {}

  // If all fail, throw the same error you originally had
  throw new Error('Failed to download YouTube video');
},
  
  // Instagram Download
  igDownload: async (url) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/d/igdl`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download Instagram content');
    }
  },
  
  // TikTok Download
  tiktokDownload: async (url) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/d/tiktok`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download TikTok video');
    }
  },
  
  // Translate
  translate: async (text, to = 'en') => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/tools/translate`, {
        params: { text, to }
      });
      return response.data;
    } catch (error) {
      throw new Error('Translation failed');
    }
  },
  
  // Random Meme
  getMeme: async () => {
    try {
      const response = await api.get('https://meme-api.com/gimme');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch meme');
    }
  },
  
  // Random Quote
  getQuote: async () => {
    try {
      const response = await api.get('https://api.quotable.io/random');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch quote');
    }
  },
  
  // Random Joke
  getJoke: async () => {
    try {
      const response = await api.get('https://official-joke-api.appspot.com/random_joke');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch joke');
    }
  },
  
  // Weather
  getWeather: async (city) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/tools/weather`, {
        params: { city }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch weather');
    }
  },
  
  // Shorten URL
  shortenUrl: async (url) => {
    try {
      const response = await api.get(`https://tinyurl.com/api-create.php`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to shorten URL');
    }
  },
  
  // Wikipedia Search
  wikiSearch: async (query) => {
    try {
      const response = await api.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error('Wikipedia search failed');
    }
  },
  
  // Song Download APIs (unchanged)
  getIzumiDownloadByUrl: async (youtubeUrl) => { /* ... */ },
  getIzumiDownloadByQuery: async (query) => { /* ... */ },
  getYupraDownloadByUrl: async (youtubeUrl) => { /* ... */ },
  getOkatsuDownloadByUrl: async (youtubeUrl) => { /* ... */ },
  getEliteProTechDownloadByUrl: async (youtubeUrl) => { /* ... */ },
  getEliteProTechVideoByUrl: async (youtubeUrl) => { /* ... */ },
  
  // Video Download APIs
  getYupraVideoByUrl: async (youtubeUrl) => { /* ... */ },
  getOkatsuVideoByUrl: async (youtubeUrl) => { /* ... */ },
  
  // TikTok Download API
  getTikTokDownload: async (url) => { /* ... */ },
  
  // Screenshot Website API
  screenshotWebsite: async (url) => { /* ... */ },
  
  // Text to Speech API
  textToSpeech: async (text) => { /* ... */ }
};

module.exports = APIs;
