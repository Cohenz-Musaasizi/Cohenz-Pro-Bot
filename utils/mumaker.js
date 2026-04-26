// utils/mumaker.js – uses Siputzx API (reliable, same provider as your other commands)
const axios = require('axios');

const BASE = 'https://api.siputzx.my.id/api/maker/textpro';

/**
 * Generate a text effect by calling the Siputzx API.
 * @param {string} effect - e.g. 'purple', 'thunder', 'sand'
 * @param {string} text   - the text to apply the effect to
 * @returns {Promise<{image: string}>} - object containing the image URL
 */
async function createEffect(effect, text) {
  if (!text) throw new Error('No text provided');
  try {
    const { data } = await axios.get(`${BASE}/${effect}`, {
      params: { text },
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    // The API usually returns an object with a `url` field
    if (data && data.url) return { image: data.url };
    // Sometimes the URL is returned directly as a string
    if (typeof data === 'string' && data.startsWith('http')) return { image: data };
    throw new Error('No image URL returned from API');
  } catch (err) {
    throw new Error(`Failed to generate ${effect} effect: ${err.message}`);
  }
}

// Generic ephoto – many commands call this
const ephoto = async (ignoredUrl, text) => createEffect('purple', text);

module.exports = {
  ephoto,
  purple:    (t) => createEffect('purple', t),
  thunder:   (t) => createEffect('thunder', t),
  neon:      (t) => createEffect('neon', t),
  sand:      (t) => createEffect('sand', t),
  glitch:    (t) => createEffect('glitch', t),
  blackpink: (t) => createEffect('blackpink', t),
  hacker:    (t) => createEffect('hacker', t),
  devil:     (t) => createEffect('devil', t),
  matrix:    (t) => createEffect('matrix', t),
  light:     (t) => createEffect('light', t),
  snow:      (t) => createEffect('snow', t),
  ice:       (t) => createEffect('ice', t),
  metallic:  (t) => createEffect('metallic', t),
  impressive:(t) => createEffect('impressive', t),
  leaves:    (t) => createEffect('leaves', t),
  arena:     (t) => createEffect('arena', t),
  fire:      (t) => createEffect('fire', t),
  '1917':    (t) => createEffect('1917', t),

  // Aliases for common typos / variations
  ephto: ephoto,
  exec:  (t) => createEffect('purple', t),
};
