// utils/mumaker.js – Permanent, offline, unique text effects using canvas
const { createCanvas } = require('canvas');

const STYLES = {
  purple:    { bg: '#4a148c', text: '#e1bee7', font: 'bold 60px "DejaVu Sans"' },
  thunder:   { bg: '#212121', text: '#ffeb3b', font: 'bold 60px "DejaVu Sans"' },
  neon:      { bg: '#000000', text: '#00e5ff', font: 'italic bold 60px "DejaVu Sans"' },
  sand:      { bg: '#f4e1a1', text: '#5d4e37', font: 'bold 60px "DejaVu Sans"' },
  glitch:    { bg: '#1a1a1a', text: '#ff4081', font: 'bold 60px "Courier New"' },
  blackpink: { bg: '#111111', text: '#ff1493', font: 'bold 60px "DejaVu Sans"' },
  hacker:    { bg: '#0d0d0d', text: '#00ff00', font: 'bold 60px "Courier New"' },
  devil:     { bg: '#1a0000', text: '#ff3333', font: 'bold 60px "DejaVu Sans"' },
  matrix:    { bg: '#0a0a0a', text: '#00ff00', font: 'bold 60px "Courier New"' },
  light:     { bg: '#ffffff', text: '#222222', font: 'bold 60px "DejaVu Sans"' },
  snow:      { bg: '#e0f7fa', text: '#006064', font: 'bold 60px "DejaVu Sans"' },
  ice:       { bg: '#e3f2fd', text: '#0d47a1', font: 'bold 60px "DejaVu Sans"' },
  metallic:  { bg: '#37474f', text: '#cfd8dc', font: 'bold 60px "DejaVu Sans"' },
  impressive:{ bg: '#311b92', text: '#d1c4e9', font: 'bold 60px "DejaVu Sans"' },
  leaves:    { bg: '#2e7d32', text: '#c8e6c9', font: 'bold 60px "DejaVu Sans"' },
  arena:     { bg: '#4e342e', text: '#ffb300', font: 'bold 60px "DejaVu Sans"' },
  fire:      { bg: '#b71c1c', text: '#ffcc80', font: 'bold 60px "DejaVu Sans"' },
  '1917':    { bg: '#5d4037', text: '#f5f5dc', font: 'bold 60px "DejaVu Sans"' },
};

const defaultStyle = { bg: '#1e1e2e', text: '#cdd6f4', font: 'bold 60px "DejaVu Sans"' };

function generateImage(effect, text) {
  const style = STYLES[effect] || defaultStyle;
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Colored background
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Main text
  ctx.fillStyle = style.text;
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // 3. Small effect label at top‑left
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '18px "DejaVu Sans"';
  ctx.fillText(effect.toUpperCase(), 20, 30);

  return canvas.toBuffer('image/png');
}

function createEffect(effect, text) {
  if (!text) throw new Error('No text provided');
  const buffer = generateImage(effect, text);
  return { image: `data:image/png;base64,${buffer.toString('base64')}` };
}

// Generic ephoto (matching what your commands like purple.js call)
const ephoto = (_, text) => createEffect('purple', text);

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
