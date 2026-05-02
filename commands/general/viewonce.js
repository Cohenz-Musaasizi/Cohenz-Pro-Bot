/**
 * ViewOnce Command - Reveal view-once messages
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'viewonce',
  aliases: ['readvo', 'read', 'vv', 'readviewonce'],
  category: 'general',
  description: 'Reveal view-once messages (images/videos/audio)',
  usage: '.viewonce (reply to view-once message)',
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      // Try to get contextInfo from different message types
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo
        || msg.message?.buttonsResponseMessage?.contextInfo
        || msg.message?.listResponseMessage?.contextInfo;

      if (!ctx?.quotedMessage || !ctx?.stanzaId) {
        return await reply('🗑️ Reply to a *view-once* message to reveal it.');
      }

      const quotedMsg = ctx.quotedMessage;

      const hasViewOnce =
        !!quotedMsg.viewOnceMessageV2 ||
        !!quotedMsg.viewOnceMessageV2Extension ||
        !!quotedMsg.viewOnceMessage ||
        !!quotedMsg.viewOnce ||
        !!quotedMsg?.imageMessage?.viewOnce ||
        !!quotedMsg?.videoMessage?.viewOnce ||
        !!quotedMsg?.audioMessage?.viewOnce;

      if (!hasViewOnce) {
        return await reply('❌ This is not a view-once message!');
      }

      let actualMsg = null;
      let mtype = null;

      if (quotedMsg.viewOnceMessageV2Extension?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2Extension.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessageV2?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessage?.message) {
        actualMsg = quotedMsg.viewOnceMessage.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.imageMessage?.viewOnce) {
        actualMsg = { imageMessage: quotedMsg.imageMessage };
        mtype = 'imageMessage';
      } else if (quotedMsg.videoMessage?.viewOnce) {
        actualMsg = { videoMessage: quotedMsg.videoMessage };
        mtype = 'videoMessage';
      } else if (quotedMsg.audioMessage?.viewOnce) {
        actualMsg = { audioMessage: quotedMsg.audioMessage };
        mtype = 'audioMessage';
      }

      if (!actualMsg || !mtype) {
        return await reply('❌ Unsupported view-once message type.');
      }

      const downloadType =
        mtype === 'imageMessage'
          ? 'image'
          : mtype === 'videoMessage'
          ? 'video'
          : 'audio';

      const mediaStream = await downloadContentFromMessage(
        actualMsg[mtype],
        downloadType
      );

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const caption = actualMsg[mtype]?.caption || '';

      if (/video/.test(mtype)) {
        await sock.sendMessage(
          from,
          {
            video: buffer,
            caption,
            mimetype: 'video/mp4'
          },
          { quoted: msg }
        );
      } else if (/image/.test(mtype)) {
        await sock.sendMessage(
          from,
          {
            image: buffer,
            caption,
            mimetype: 'image/jpeg'
          },
          { quoted: msg }
        );
      } else if (/audio/.test(mtype)) {
        await sock.sendMessage(
          from,
          {
            audio: buffer,
            ptt: true,
            mimetype: 'audio/ogg; codecs=opus'
          },
          { quoted: msg }
        );
      }
    } catch (error) {
      console.error('Error in viewonce command:', error);
      await reply(
        '❌ Error processing view-once message: ' +
        (error.message || 'Unknown error')
      );
    }
  }
};
