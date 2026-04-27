// commands/media/song.js – Reliable audio document (.m4a)
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const { PassThrough } = require('stream');

// list of usable download APIs (tried in order)
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
  {
    name: 'yupra',
    url: (vu) => `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(vu)}`,
    extract: (d) => d?.data?.download_url || d?.data?.url || d?.data?.audio_url,
  },
];

// helper: check if a URL looks like a playable audio file
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

    // search YouTube if the user typed a name
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
      let ext = '.m4a';  // default extension

      for (const dl of DOWNLOADERS) {
        try {
          const { data } = await axios.get(dl.url(videoUrl), { timeout: 15000 });
          const rawUrl = dl.extract(data);
          if (rawUrl && looksLikeAudio(rawUrl)) {
            // download the file ourselves so we can send it as a document
            const resp = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 30000 });
            audioBuffer = Buffer.from(resp.data);
            ext = rawUrl.endsWith('.mp3') ? '.mp3' : '.m4a';
            break;
          }
        } catch (e) { /* next */ }
      }

      // 3. If no API worked, fall back to ytdl-core + FFmpeg (aac)
      if (!audioBuffer) {
        const audioStream = ytdl(videoUrl, {
          quality: 'highestaudio',
          filter: 'audioonly',
          highWaterMark: 1 << 25,
        });

        // use aac codec (built‑in) → produce m4a (mp4 container)
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
        // buffer is m4a inside mp4 container
        ext = '.m4a';
      }

      // 4. Build safe file name
      const safeName = videoTitle
        ? videoTitle.replace(/[/\\?%*:|"<>]/g, '').trim() + ext
        : `song${ext}`;

      // 5. Send as document with proper mimetype
      await sock.sendMessage(from, {
        document: audioBuffer,
        fileName: safeName,
        mimetype: ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4',
      }, { quoted: msg });

    } catch (err) {
      console.error('song error:', err);
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
