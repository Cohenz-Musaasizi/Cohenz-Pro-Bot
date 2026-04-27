// utils/mumaker.js - reliable local fallback + API attempts
const axios = require('axios');
const { createCanvas } = require('canvas');

// ── API endpoints to try (in order) ──────────────────
const API_URLS = [
    {
        name: 'siputzx',
        url: (effect, text) => `https://api.siputzx.my.id/api/maker/textpro/${effect}?text=${encodeURIComponent(text)}`,
    },
    {
        name: 'nexray',
        url: (effect, text) => `https://api.nexray.web.id/api/maker/ephoto?theme=${effect}&text=${encodeURIComponent(text)}`,
    },
];

/**
 * Try to fetch a real text effect from online APIs.
 * Returns an image URL string, or null if all fail.
 */
async function fetchRemoteEffect(effect, text) {
    for (const api of API_URLS) {
        try {
            const { data } = await axios.get(api.url(effect, text), { timeout: 15000 });
            // Different APIs return different shapes
            const imageUrl = data?.url || data?.image || (typeof data === 'string' && data.startsWith('http') ? data : null);
            if (imageUrl) return imageUrl;
        } catch (e) {
            // try next
        }
    }
    return null;
}

/**
 * Generate a local image with the effect name and user text.
 * Returns a base64-encoded PNG data URI.
 */
function generateLocalImage(effect, text) {
    const width = 600;
    const height = 200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, width, height);

    // Effect label
    ctx.fillStyle = '#cdd6f4';
    ctx.font = 'bold 36px "DejaVu Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(effect.toUpperCase(), width / 2, 70);

    // User text
    ctx.fillStyle = '#89b4fa';
    ctx.font = '28px "DejaVu Sans"';
    ctx.fillText(text, width / 2, 140);

    return canvas.toDataURL('image/png');
}

/**
 * Main entry point for your commands.
 * Returns { image: 'url-or-data-uri' }.
 */
async function createEffect(effect, text) {
    if (!text) throw new Error('No text provided');

    // Try online APIs first
    const remoteUrl = await fetchRemoteEffect(effect, text);
    if (remoteUrl) return { image: remoteUrl };

    // Fallback to local generation (always works)
    const localDataUri = generateLocalImage(effect, text);
    return { image: localDataUri };
}

// Generic ephoto (many commands call this)
const ephoto = async (_, text) => createEffect('purple', text);

// Export every effect your commands use
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
    // Aliases
    ephto: ephoto,
    exec:  (t) => createEffect('purple', t),
};
