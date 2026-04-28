// utils/mumaker.js – real text effects using textpro-me (offline, no API, no canvas)
const { TextPro } = require('textpro-me');
const textpro = new TextPro();

// Map your command effect names to textpro-me theme names
const effectMap = {
    purple:    'purple',
    thunder:   'thunder',
    neon:      'neon',
    sand:      'sand',
    glitch:    'glitch',
    blackpink: 'blackpink',
    hacker:    'hacker',
    devil:     'devil',
    matrix:    'matrix',
    light:     'light',
    snow:      'snow',
    ice:       'ice',
    metallic:  'metallic',
    impressive:'impressive',
    leaves:    'leaves',
    arena:     'arena',
    fire:      'fire',
    '1917':    '1917',
};

async function createEffect(effect, text) {
    if (!text) throw new Error('No text provided');

    const theme = effectMap[effect];
    if (!theme) throw new Error(`Effect "${effect}" not supported.`);

    const result = await textpro.create(theme, text);
    // result is a buffer
    const base64 = result.toString('base64');
    return { image: `data:image/png;base64,${base64}` };
}

// Generic ephoto – called by many commands
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
