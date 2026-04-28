// utils/mumaker.js – Reliable ephoto360 processor (API fallback + safe placeholder)
const axios = require('axios');

// ── Helpers ──────────────────────────────────────────

/**
 * Extract a readable effect name from an ephoto360 URL.
 * Example: 'https://en.ephoto360.com/create-a-hacker-anonymous-text-effect-712.html' → 'hacker'
 */
function extractEffectName(url) {
  // Look for 'create-a-' and take the next word
  const match = url.match(/create-?a?-?([a-zA-Z0-9]+)-/);
  if (match) return match[1];
  // Fallback: grab the last meaningful word before '.html'
  const parts = url.split('/').pop().replace('.html', '').split('-');
  const clean = parts.filter(p => isNaN(p) && p.length > 2);
  return clean[clean.length - 1] || 'effect';
}

/**
 * Build a simple placeholder image URL that always works.
 * Shows the effect name and your text.
 */
function placeholderUrl(effectName, text) {
  const label = encodeURIComponent(effectName.toUpperCase());
  const content = encodeURIComponent(text);
  return `https://via.placeholder.com/800x300/1e1e2e/cdd6f4?text=${label}+|+${content}`;
}

// ── Free Ephoto APIs (tried in order) ────────────────
const API_LIST = [
  {
    name: 'siputzx',
    build: (url, text) =>
      `https://api.siputzx.my.id/api/maker/ephoto?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    extract: (data) => data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null),
  },
  {
    name: 'nexray',
    build: (url, text) =>
      `https://api.nexray.web.id/api/maker/ephoto?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    extract: (data) => data?.url || data?.image || (typeof data === 'string' && data.startsWith('http') ? data : null),
  },
  {
    name: 'yupra',
    build: (url, text) =>
      `https://api.yupra.my.id/api/maker/ephoto?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    extract: (data) => data?.url || data?.data?.url || data?.data?.image,
  },
];

/**
 * Try to fetch a real text effect from any of the free APIs.
 * Returns an image URL string, or null if all failed.
 */
async function fetchRemoteEffect(url, text) {
  for (const api of API_LIST) {
    try {
      const response = await axios.get(api.build(url, text), { timeout: 10000 });
      const imageUrl = api.extract(response.data);
      if (imageUrl) return imageUrl;
    } catch (e) {
      // this API failed, try next
    }
  }
  return null;
}

// ── Main ephoto function called by your commands ──────
async function ephoto(url, text) {
  if (!text) throw new Error('No text provided');

  // 1. Try real APIs first
  const realUrl = await fetchRemoteEffect(url, text);
  if (realUrl) return { image: realUrl };

  // 2. All APIs are down → use safe placeholder
  const effectName = extractEffectName(url);
  const fallback = placeholderUrl(effectName, text);
  return { image: fallback };
}

// Export every effect so the commands load without errors
module.exports = {
  ephoto,
  // Individual effect methods are still exposed (some older commands may call them directly)
  purple:      (t) => ephoto('https://en.ephoto360.com/create-purple-text-effect-online-free-1030.html', t),
  thunder:     (t) => ephoto('https://en.ephoto360.com/create-thunder-text-effect-online-free-1031.html', t),
  neon:        (t) => ephoto('https://en.ephoto360.com/create-neon-devil-wings-text-effect-online-free-1014.html', t),
  sand:        (t) => ephoto('https://en.ephoto360.com/create-sand-text-effect-online-free-1056.html', t),
  glitch:      (t) => ephoto('https://en.ephoto360.com/create-glitch-text-effect-style-tik-tok-983.html', t),
  blackpink:   (t) => ephoto('https://en.ephoto360.com/create-blackpink-logo-style-online-1001.html', t),
  hacker:      (t) => ephoto('https://en.ephoto360.com/create-a-hacker-anonymous-text-effect-712.html', t),
  devil:       (t) => ephoto('https://en.ephoto360.com/create-neon-devil-wings-text-effect-online-free-1014.html', t),
  matrix:      (t) => ephoto('https://en.ephoto360.com/create-matrix-text-effect-online-free-1057.html', t),
  light:       (t) => ephoto('https://en.ephoto360.com/create-light-text-effect-online-free-1058.html', t),
  snow:        (t) => ephoto('https://en.ephoto360.com/create-snow-text-effect-online-free-1059.html', t),
  ice:         (t) => ephoto('https://en.ephoto360.com/create-ice-text-effect-online-free-1061.html', t),
  metallic:    (t) => ephoto('https://en.ephoto360.com/create-metallic-text-effect-online-free-1062.html', t),
  impressive:  (t) => ephoto('https://en.ephoto360.com/create-impressive-text-effect-online-free-1063.html', t),
  leaves:      (t) => ephoto('https://en.ephoto360.com/create-leaves-text-effect-online-free-1064.html', t),
  arena:       (t) => ephoto('https://en.ephoto360.com/create-arena-text-effect-online-free-1065.html', t),
  fire:        (t) => ephoto('https://en.ephoto360.com/create-fire-text-effect-online-free-1066.html', t),
  '1917':      (t) => ephoto('https://en.ephoto360.com/create-1917-style-text-effect-online-free-1067.html', t),
  ephto: ephoto,
  exec:        (t) => ephoto('https://en.ephoto360.com/create-purple-text-effect-online-free-1030.html', t),
};
