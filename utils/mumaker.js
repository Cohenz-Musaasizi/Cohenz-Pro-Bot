// utils/mumaker.js – using Photoxy API (direct, no scraping)
const axios = require('axios');

/**
 * Calls the Photoxy API to generate a text effect.
 * @param {string} effect - e.g. 'purple', 'thunder'
 * @param {string} text
 * @returns {Promise<{image: string}>}
 */
const createEffect = async (effect, text) => {
    if (!text) throw new Error('No text provided');
    const url = `https://api.photoxy.app/v1/textpro/${effect}?text=${encodeURIComponent(text)}`;
    const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
    });
    // The API returns either an object with .url or the URL string directly
    const imageUrl = data.url || (typeof data === 'string' && data.startsWith('http') ? data : null);
    if (!imageUrl) throw new Error('No image URL returned');
    return { image: imageUrl };
};

// Generic ephoto – many commands call this
const ephoto = async (_, text) => createEffect('purple', text);

module.exports = {
    ephoto,
    purple:   (t) => createEffect('purple', t),
    thunder:  (t) => createEffect('thunder', t),
    neon:     (t) => createEffect('neon', t),
    sand:     (t) => createEffect('sand', t),
    glitch:   (t) => createEffect('glitch', t),
    blackpink:(t) => createEffect('blackpink', t),
    hacker:   (t) => createEffect('hacker', t),
    devil:    (t) => createEffect('devil', t),
    matrix:   (t) => createEffect('matrix', t),
    light:    (t) => createEffect('light', t),
    snow:     (t) => createEffect('snow', t),
    ice:      (t) => createEffect('ice', t),
    metallic: (t) => createEffect('metallic', t),
    impressive:(t) => createEffect('impressive', t),
    leaves:   (t) => createEffect('leaves', t),
    arena:    (t) => createEffect('arena', t),
    fire:     (t) => createEffect('fire', t),
    '1917':   (t) => createEffect('1917', t),

    // Common aliases
    ephto: ephoto,
    exec:  (t) => createEffect('purple', t),
};
