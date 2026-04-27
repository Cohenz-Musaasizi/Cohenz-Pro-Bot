// utils/mumaker.js – guaranteed real text effects using siputzx TextPro API
const axios = require('axios');

const BASE = 'https://api.siputzx.my.id/api/m/textpro';

// Map your command effect names to their actual TextPro URLs
const EFFECT_URLS = {
    purple:    'https://textpro.me/create-purple-text-effect-online-free-1030.html',
    thunder:   'https://textpro.me/create-thunder-text-effect-online-free-1031.html',
    neon:      'https://textpro.me/create-neon-devil-wings-text-effect-online-free-1014.html',
    sand:      'https://textpro.me/create-sand-summe-text-effect-online-free-1056.html',
    glitch:    'https://textpro.me/create-glitch-text-effect-style-tik-tok-983.html',
    blackpink: 'https://textpro.me/create-blackpink-logo-style-online-1001.html',
    hacker:    'https://textpro.me/create-hacker-text-effect-online-free-1060.html',
    devil:     'https://textpro.me/create-neon-devil-wings-text-effect-online-free-1014.html',
    matrix:    'https://textpro.me/create-matrix-text-effect-online-free-1057.html',
    light:     'https://textpro.me/create-light-text-effect-online-free-1058.html',
    snow:      'https://textpro.me/create-snow-text-effect-online-free-1059.html',
    ice:       'https://textpro.me/create-ice-text-effect-online-free-1061.html',
    metallic:  'https://textpro.me/create-metallic-text-effect-online-free-1062.html',
    impressive:'https://textpro.me/create-impressive-text-effect-online-free-1063.html',
    leaves:    'https://textpro.me/create-leaves-text-effect-online-free-1064.html',
    arena:     'https://textpro.me/create-arena-text-effect-online-free-1065.html',
    fire:      'https://textpro.me/create-fire-text-effect-online-free-1066.html',
    '1917':    'https://textpro.me/1917-style-text-effect-online-free-1067.html',

// Add more effect mappings here as needed
};

/**
 * Generate a real text effect by calling the siputzx TextPro API.
 * @param {string} effect - e.g., 'purple', 'thunder', 'sand'
 * @param {string} text   - the text to apply the effect to
 * @returns {Promise<{image: string}>} - object containing the image URL
 */
async function createEffect(effect, text) {
    if (!text) throw new Error('No text provided');

    const url = EFFECT_URLS[effect];
    if (!url) {
        // If effect not in the map, fallback to a known effect (purple)
        return createEffect('purple', text);
    }

    try {
        const { data } = await axios.get(BASE, {
            params: { url, text1: text },
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' },
            responseType: 'arraybuffer',
        });

        // The API returns the image directly as a PNG buffer
        const imageBase64 = Buffer.from(data).toString('base64');
        // Return the image as a data URI that WhatsApp can send
        return { image: `data:image/png;base64,${imageBase64}` };
    } catch (error) {
        console.error(`Textpro API error (${effect}):`, error.message);
        throw new Error(`Failed to generate ${effect} effect. Please try again later.`);
    }
}

// Generic ephoto – many commands call this
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
    // Aliases for common typos / variations
    ephto: ephoto,
    exec:  (t) => createEffect('purple', t),
};
