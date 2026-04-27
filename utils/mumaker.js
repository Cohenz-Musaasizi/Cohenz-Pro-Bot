// utils/mumaker.js – Guaranteed unique text effects via API
const axios = require('axios');

const BASE_URL = 'https://api.siputzx.my.id/api/maker/textpro';

// Map command effect names to their actual TextPro theme names
const effectMap = {
    purple: 'purple',
    thunder: 'thunder',
    neon: 'neon',
    sand: 'sand',
    glitch: 'glitch',
    blackpink: 'blackpink',
    hacker: 'hacker',
    devil: 'devil',
    matrix: 'matrix',
    light: 'light',
    snow: 'snow',
    ice: 'ice',
    metallic: 'metallic',
    impressive: 'impressive',
    leaves: 'leaves',
    arena: 'arena',
    fire: 'fire',
    '1917': '1917',
};

/**
 * Calls the API to generate a real text effect.
 */
async function createEffect(effect, text) {
    if (!text) throw new Error('No text provided');

    // Use the effect name itself as the API theme parameter
    const apiTheme = effectMap[effect] || effect;

    try {
        const { data } = await axios.get(`${BASE_URL}/${apiTheme}`, {
            params: { text },
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // The API may return a URL directly or inside an object
        const imageUrl = data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null);
        if (!imageUrl) throw new Error('No image URL returned');

        return { image: imageUrl };
    } catch (err) {
        console.error(`Textpro API error (${effect}):`, err.message);
        throw new Error(`Failed to generate ${effect} effect. Please try again later.`);
    }
}

// Generic ephoto method (called by many commands)
const ephoto = async (url, text) => createEffect('purple', text);

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
    // Aliases for common typos
    ephto: ephoto,
    exec:  (t) => createEffect('purple', t),
};
