// commands/media/song.js – YouTube Data API + direct download (never blocked)
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const { google } = require('googleapis');

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

    // 1. Search YouTube using Data API (or direct URL)
    let videoUrl = query;
    let videoTitle = '';

    try {
      if (!/^https?:\/\//i.test(query)) {
        const youtube = google.youtube({
          version: 'v3',
          auth: process.env.YOUTUBE_API_KEY,
        });
        const res = await youtube.search.list({
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults: 1,
        });
        const item = res.data.items?.[0];
        if (!item) throw new Error('No results');
        const videoId = item.id.videoId;
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        videoTitle = item.snippet.title;
      }
    } catch (apiErr) {
      // Fallback to yt-search if YouTube Data API fails
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        videoUrl = search.videos[0].url;
        videoTitle = search.videos[0].title;
      } catch (ytErr) {
        return reply('❌ Could not find any video. Try different keywords.');
      }
    }

    if (videoTitle) await reply(`🔍 Found: *${videoTitle}*`);

    // 2. Send thumbnail (safe, non‑critical)
    try {
      const vidId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (vidId) {
        await sock.sendMessage(from, {
          image: { url: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` },
          caption: videoTitle ? `🎵 *${videoTitle}*` : '',
        }, { quoted: msg });
      }
    } catch (e) {}

    // 3. Download audio with ytdl-core (direct, no API blocks)
    try {
      const audioStream = ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25,
      });

      const ffmpegProcess = ffmpeg(audioStream)
        .audioCodec('aac')
        .format('ipod')
        .audioBitrate('128k')
        .audioChannels(2)
        .on('error', (err) => console.error('FFmpeg error:', err));

      const chunks = [];
      const outputStream = new PassThrough();
      outputStream.on('data', (chunk) => chunks.push(chunk));
      ffmpegProcess.pipe(outputStream);

      const audioBuffer = await new Promise((resolve, reject) => {
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

      const safeName = videoTitle
        ? videoTitle.replace(/[/\\?%*:|"<>]/g, '').trim() + '.m4a'
        : 'song.m4a';

      await sock.sendMessage(from, {
        document: audioBuffer,
        fileName: safeName,
        mimetype: 'audio/mp4',
      }, { quoted: msg });

    } catch (err) {
      console.error('song error:', err);
      reply(`❌ Failed: ${err.message}`);
    }
  }
};
