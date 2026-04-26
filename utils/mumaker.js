// utils/mumaker.js – using ruhend-scraper for text effects (offline, no API key)
const ruhend = require('ruhend-scraper');

module.exports = {
  // Generic ephoto method (matches what your commands call)
  ephoto: async (url, text) => {
    // url is ignored — we just need the text
    if (!text) throw new Error('No text provided');
    try {
      // ruhend-scraper offers many textpro/ephoto methods.
      // We'll use the 'purple' theme as default, but you can map them per command.
      const result = await ruhend.textpro('purple', text);
      return { image: result }; // result is a URL string
    } catch (e) {
      throw new Error('Failed to generate text effect');
    }
  },

  // Individual effect methods (e.g., mumaker.purple('text'))
  purple: async (text) => {
    try {
      const url = await ruhend.textpro('purple', text);
      return { image: url };
    } catch (e) { throw new Error('Failed: purple effect'); }
  },

  thunder: async (text) => {
    try {
      const url = await ruhend.textpro('thunder', text);
      return { image: url };
    } catch (e) { throw new Error('Failed: thunder effect'); }
  },

  neon: async (text) => {
    try {
      const url = await ruhend.textpro('neon', text);
      return { image: url };
    } catch (e) { throw new Error('Failed: neon effect'); }
  },

  // Add more effects as you need them — keep the same pattern.
};
