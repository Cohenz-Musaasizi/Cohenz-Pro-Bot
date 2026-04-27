// utils/mumaker.js – Reliable text effects (API + local fallback)
const axios = require('axios');
const { createCanvas } = require('canvas');

const API_BASE = 'https://api.siputzx.my.id/api/maker/textpro';

async function tryApiEffect(effect, text) {
  try {
    const { data } = await axios.get(`${API_BASE}/${effect}`, {
      params: { text },
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (data && data.url) return data.url;
  } catch (e) { /* ignore */ }
  return null;
}

function localEffect(effect, text) {
  const W = 600, H = 200;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#cdd6f4';
  ctx.font = 'bold 36px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.fillText(effect.toUpperCase(), W/2, 70);

  ctx.fillStyle = '#89b4fa';
  ctx.font = '28px "DejaVu Sans"';
  ctx.fillText(text, W/2, 140);

  return canvas.toDataURL('image/png');
}

async function createEffect(effect, text) {
  if (!text) throw new Error('No text provided');
  const onlineUrl = await tryApiEffect(effect, text);
  if (onlineUrl) return { image: onlineUrl };
  const dataUri = localEffect(effect, text);
  return { image: dataUri };
}

// ephoto is called by most commands
const ephoto = (_, text) => createEffect('purple', text);

module.exports = {
  ephoto,
  purple:     t => createEffect('purple', t),
  thunder:    t => createEffect('thunder', t),
  neon:       t => createEffect('neon', t),
  sand:       t => createEffect('sand', t),
  glitch:     t => createEffect('glitch', t),
  blackpink:  t => createEffect('blackpink', t),
  hacker:     t => createEffect('hacker', t),
  devil:      t => createEffect('devil', t),
  matrix:     t => createEffect('matrix', t),
  light:      t => createEffect('light', t),
  snow:       t => createEffect('snow', t),
  ice:        t => createEffect('ice', t),
  metallic:   t => createEffect('metallic', t),
  impressive: t => createEffect('impressive', t),
  leaves:     t => createEffect('leaves', t),
  arena:      t => createEffect('arena', t),
  fire:       t => createEffect('fire', t),
  '1917':     t => createEffect('1917', t),
  ephto: ephoto,
  exec:  t => createEffect('purple', t),
};
