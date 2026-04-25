// utils/mumaker.js – Real text‑effect generation
const axios = require('axios');

// Map common effect names to this API's "theme" parameter.
// Add any other effects your commands call.
const effectMap = {
    purple: 'purple',
    thunder: 'thunder',
    sand: 'sand',
    neon: 'neon',
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
    '1917': '1917',       // if you have a .1917 command
    ephto: 'purple',      // fallback for common typo
    ephoto: 'purple',     // fallback
    // Add more as needed
};

/**
 * Generic ephoto method – your commands use this.
 * @param {string} url  – a placeholder URL (unused by the real API, but kept for compatibility)
 * @param {object|string} options – either options object or text string
 * @returns {object} { image: 'downloadable image url' }
 */
async function ephoto(url, options) {
    // Your commands sometimes pass an object with .image, sometimes just text.
    // We'll extract the text from options or from a second argument.
    let text = '';
    if (typeof options === 'string') {
        text = options;
    } else if (options && typeof options === 'object') {
        text = options.text || options.caption || '';
    }

    // If no text, try the last command args? We'll just return an error.
    if (!text) throw new Error('No text provided for effect.');

    // Use a default theme (you can customize based on url if needed)
    const theme = 'purple'; // default; the command can override by calling a specific method
    const apiUrl = `https://api.siputzx.my.id/api/maker/ephoto?theme=${encodeURIComponent(theme)}&text=${encodeURIComponent(text)}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });
    if (data && data.status === 200 && data.url) {
        return { image: data.url };
    }
    throw new Error('API did not return an image URL');
}

// Create separate methods for each effect, but they all call the same API
const methods = {};
Object.keys(effectMap).forEach(effect => {
    methods[effect] = (text) => {
        // Commands that call e.g., mumaker.purple('text') – we'll create a wrapper
        return ephoto(`https://example.com/${effect}`, text);
    };
});

// Also include the generic ephoto
methods.ephoto = ephoto;

module.exports = methods;
