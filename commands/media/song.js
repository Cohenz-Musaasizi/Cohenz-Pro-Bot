// commands/media/song.js – Reliable audio document (.m4a)
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core'); // More resistant to YouTube blocks
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const { PassThrough } = require('stream');

// Reliable download API to try first
const DOWNLOADERS = [
  {
    name: 'flashdl',
    url: (vu) => `https://api.flashdl.one/api/youtube/download?url=${encodeURIComponent(vu)}&type=mp3`,
    extract: (d) => d?.data?.downloadUrl || d?.downloadUrl || d?.url,
  },
  {
    name: 'siputzx',
    url: (vu) => `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(vu)}`,
    extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.audio_url,
  },
];

// Helper to check if a URL looks like a playable audio file
const looksLikeAudio = (url) =>
  url && (url.endsWith('.mp3') || url.endsWith('.m4a') || url.includes('audio/'));

module.exports = {
  name: 'song',
  aliases: ['mp3', 'audio', 'ytaudio'],
  category: 'media',
  description: 'Download YouTube audio by name or link',
  usage: '.song Fik Fameica new song',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name or YouTube link.');

    let videoUrl = query;
    let videoTitle = '';

    // Search YouTube if the user typed a name
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (err) {
        return reply('❌ Could not find any video.');
      }
    }

    try {
      await sock.sendPresenceUpdate('composing', from);

      // 1. Send thumbnail (if we have a title)
      if (videoTitle) {
        const vidId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (vidId) {
          try {
            await sock.sendMessage(from, {
              image: { url: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` },
              caption: `🎵 *${videoTitle}*`,
            }, { quoted: msg });
          } catch (e) {}
        }
      }

      // 2. Try external download APIs first
      let audioBuffer = null;

      for (const dl of DOWNLOADERS) {
        try {
          const { data } = await axios.get(dl.url(videoUrl), { timeout: 15000 });
          const rawUrl = dl.extract(data);
          if (rawUrl && looksLikeAudio(rawUrl)) {
            // Download the file ourselves so we can send it as a document
            const resp = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 30000 });
            audioBuffer = Buffer.from(resp.data);
            break;
          }
        } catch (e) { /* try next API */ }
      }

      // 3. If no API worked, fall back to ytdl-core + FFmpeg (aac)
      if (!audioBuffer) {
        const audioStream = ytdl(videoUrl, {
          quality: 'highestaudio',
          filter: 'audioonly',
          highWaterMark: 1 << 25,
        });

        // Use aac codec (built‑in) → produce m4a (mp4 container)
        const ffmpegProcess = ffmpeg(audioStream)
          .audioCodec('aac')
          .format('ipod')          // mp4 container, WhatsApp‑friendly
          .audioBitrate('128k')
          .audioChannels(2)
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
          });

        const chunks = [];
        const outputStream = new PassThrough();
        outputStream.on('data', (chunk) => chunks.push(chunk));
        ffmpegProcess.pipe(outputStream);

        audioBuffer = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            ffmpegProcess.kill();
            reject(new Error('Conversion timed out'));
          }, 60000);

          ffmpegProcess.on('end', () => {
            clearTimeout(timer);
            resolve(Buffer.concat(chunks));
          });
          ffmpegProcess.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        });
      }

      // 4. Build safe file name
      const safeName = videoTitle
        ? videoTitle.replace(/[/\\?%*:|"<>]/g, '').trim() + '.m4a'
        : 'song.m4a';

      // 5. Send as document with proper mimetype
      await sock.sendMessage(from, {
        document: audioBuffer,
        fileName: safeName,
        mimetype: 'audio/mp4',
      }, { quoted: msg });

    } catch (err) {
      console.error('song error:', err);
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
