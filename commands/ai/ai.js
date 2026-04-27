async execute(sock, msg, args, extra) {
  const { from, reply } = extra;
  const prompt = args.join(' ');
  if (!prompt) return reply('❌ Usage: .ai <question>');

  // Use Gemini with full memory and slang
  try {
    await sock.sendPresenceUpdate('composing', from);
    const APIs = require('../../utils/api');
    const response = await APIs.gemini(prompt, from);
    await reply(response);
  } catch (err) {
    await reply(`❌ AI Error: ${err.message}`);
  } finally {
    await sock.sendPresenceUpdate('paused', from);
  }
}
