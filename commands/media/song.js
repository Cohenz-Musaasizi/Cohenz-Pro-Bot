// commands/media/song.js – Direct MP3 Document + Thumbnail
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

module.exports = {
  name: 'song',
  aliases: ['mp3', 'audio', 'ytaudio'],
  category: 'media',
  description: 'Download YouTube audio (MP3) by name or link',
  usage: '.song Fik Fameica new song',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name or YouTube link.');

    let videoUrl = query;
    let videoTitle = '';
    let thumbnailUrl = '';

    // Search YouTube if user typed a name
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        thumbnailUrl = vid.thumbnail;
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (err) {
        return reply('❌ Could not find any video.');
      }
    }

    try {
      await sock.sendPresenceUpdate('composing', from);

      // 1. Send thumbnail first
      if (thumbnailUrl) {
        try {
          await sock.sendMessage(from, {
            image: { url: thumbnailUrl },
            caption: `🎵 *${videoTitle}*`,
          }, { quoted: msg });
        } catch (e) {}
      }

      // 2. Stream audio from YouTube + convert to MP3 using ffmpeg
      const audioStream = ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25,  // 32 MB buffer
      });

      // Build the ffmpeg command: output as MP3 with libmp3lame
      const ffmpegProcess = ffmpeg(audioStream)
        .audioCodec('libmp3lame')
        .format('mp3')
        .audioBitrate('128k')
        .audioChannels(2)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reply('❌ Error converting audio.');
        });

      const chunks = [];
      const outputStream = new PassThrough();
      outputStream.on('data', (chunk) => chunks.push(chunk));

      ffmpegProcess.pipe(outputStream);

      // Wait for conversion to finish
      const mp3Buffer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ffmpegProcess.kill();
          reject(new Error('Audio conversion timed out'));
        }, 60000);  // 60 seconds max

        ffmpegProcess.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        ffmpegProcess.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // 3. Prepare filename (replace illegal characters)
      const safeTitle = videoTitle
        ? videoTitle.replace(/[/\\?%*:|"<>]/g, '') + '.mp3'
        : 'song.mp3';

      // 4. Send as a document with the original song name
      await sock.sendMessage(from, {
        document: mp3Buffer,
        fileName: safeTitle,
        mimetype: 'audio/mpeg',
      }, { quoted: msg });

    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
