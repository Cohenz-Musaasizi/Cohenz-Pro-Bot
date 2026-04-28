// utils/mumaker.js – artistic text effects (API + beautiful local fallback)
const axios = require('axios');
const { createCanvas } = require('canvas');

// ── Free TextPro APIs (tried in order) ──────────────────
const API_ENDPOINTS = [
    {
        name: 'siputzx-textpro',
        buildUrl: (effect, text) => `https://api.siputzx.my.id/api/maker/textpro/${effect}?text=${encodeURIComponent(text)}`,
        extract: (d) => d?.url,
    },
    {
        name: 'nexray-ephoto',
        buildUrl: (effect, text) => `https://api.nexray.web.id/api/maker/ephoto?theme=${effect}&text=${encodeURIComponent(text)}`,
        extract: (d) => d?.url || d?.image || (typeof d === 'string' && d.startsWith('http') ? d : null),
    },
    {
        name: 'yupra-textpro',
        buildUrl: (effect, text) => `https://api.yupra.my.id/api/maker/textpro?effect=${effect}&text=${encodeURIComponent(text)}`,
        extract: (d) => d?.url || d?.data?.url || d?.data?.image,
    },
];

/**
 * Try to fetch a real text effect from online APIs.
 * Returns an image URL string, or null if all fail.
 */
async function fetchRemoteEffect(effect, text) {
    for (const api of API_ENDPOINTS) {
        try {
            const { data } = await axios.get(api.buildUrl(effect, text), { timeout: 12000 });
            const imageUrl = api.extract(data);
            if (imageUrl) return imageUrl;
        } catch (e) { /* continue */ }
    }
    return null;
}

// ── Beautiful local image styles (per effect) ───────────
const STYLES = {
    purple:    { bg: '#4a148c', text: '#d1c4e9', accent: '#7c4dff' },
    thunder:   { bg: '#1a1a1a', text: '#ffeb3b', accent: '#ff9100' },
    neon:      { bg: '#000000', text: '#00e5ff', accent: '#76ff03' },
    sand:      { bg: '#f4e1a1', text: '#5d4e37', accent: '#8d6e63' },
    glitch:    { bg: '#121212', text: '#ff4081', accent: '#00e5ff' },
    blackpink: { bg: '#111111', text: '#ff1493', accent: '#00bcd4' },
    hacker:    { bg: '#050505', text: '#00ff00', accent: '#00b8d4' },
    devil:     { bg: '#1a0000', text: '#ff3333', accent: '#ff9100' },
    matrix:    { bg: '#0a0a0a', text: '#00ff00', accent: '#00c853' },
    light:     { bg: '#ffffff', text: '#222222', accent: '#ffb300' },
    snow:      { bg: '#e0f7fa', text: '#006064', accent: '#00bcd4' },
    ice:       { bg: '#e3f2fd', text: '#0d47a1', accent: '#00b0ff' },
    metallic:  { bg: '#37474f', text: '#cfd8dc', accent: '#78909c' },
    impressive:{ bg: '#311b92', text: '#d1c4e9', accent: '#7c4dff' },
    leaves:    { bg: '#2e7d32', text: '#c8e6c9', accent: '#a5d6a7' },
    arena:     { bg: '#4e342e', text: '#ffb300', accent: '#ff8f00' },
    fire:      { bg: '#b71c1c', text: '#ffcc80', accent: '#ff9800' },
    '1917':    { bg: '#5d4037', text: '#f5f5dc', accent: '#d7ccc8' },
};

const defaultStyle = { bg: '#1e1e2e', text: '#cdd6f4', accent: '#89b4fa' };

/**
 * Generate a beautiful local image with shadows, gradient text, and effect badge.
 */
function generateLocalImage(effect, text) {
    const style = STYLES[effect] || defaultStyle;
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient (subtle)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, style.bg);
    bgGrad.addColorStop(1, style.accent);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Shadow for main text
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Main text
    ctx.fillStyle = style.text;
    ctx.font = 'bold 60px "DejaVu Sans"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 10);

    // Remove shadow for badge
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Effect badge (top‑left)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, 140, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "DejaVu Sans"';
    ctx.textAlign = 'left';
    ctx.fillText(effect.toUpperCase(), 14, 26);

    return canvas.toBuffer('image/png');
}

/**
 * Main function called by every command.
 * Returns { image: 'url-or-data-uri' }.
 */
async function createEffect(effect, text) {
    if (!text) throw new Error('No text provided');

    // Try online APIs first
    const remoteUrl = await fetchRemoteEffect(effect, text);
    if (remoteUrl) return { image: remoteUrl };

    // Fallback to beautiful local generation
    const localBuffer = generateLocalImage(effect, text);
    return { image: `data:image/png;base64,${localBuffer.toString('base64')}` };
}

// Generic ephoto (many commands call this)
const ephoto = (_, text) => createEffect('purple', text);

// Export every effect
module.exports = {
    ephoto,
    purple:     (t) => createEffect('purple', t),
    thunder:    (t) => createEffect('thunder', t),
    neon:       (t) => createEffect('neon', t),
    sand:       (t) => createEffect('sand', t),
    glitch:     (t) => createEffect('glitch', t),
    blackpink:  (t) => createEffect('blackpink', t),
    hacker:     (t) => createEffect('hacker', t),
    devil:      (t) => createEffect('devil', t),
    matrix:     (t) => createEffect('matrix', t),
    light:      (t) => createEffect('light', t),
    snow:       (t) => createEffect('snow', t),
    ice:        (t) => createEffect('ice', t),
    metallic:   (t) => createEffect('metallic', t),
    impressive: (t) => createEffect('impressive', t),
    leaves:     (t) => createEffect('leaves', t),
    arena:      (t) => createEffect('arena', t),
    fire:       (t) => createEffect('fire', t),
    '1917':     (t) => createEffect('1917', t),
    ephto: ephoto,
    exec:  (t) => createEffect('purple', t),
};
