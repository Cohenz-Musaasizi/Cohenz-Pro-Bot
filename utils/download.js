// commands/utility/download.js
const axios = require('axios');

// Helper to detect platform from URL
function detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    return null;
}

// Download function using reliable free API (siputzx)
async function downloadMedia(url, type = 'video') {
    const base = 'https://api.siputzx.my.id/api/d';
    // Map platform to API endpoint
    const platform = detectPlatform(url);
    if (!platform) throw new Error('Unsupported link. Use YouTube, IG, TikTok, Facebook, or Twitter links.');

    const endpoints = {
        youtube: type === 'audio' ? `${base}/ytmp3` : `${base}/ytmp4`,
        instagram: `${base}/igdl`,
        tiktok: `${base}/tiktok`,
        facebook: `${base}/fbdl`,
        twitter: `${base}/twitterdl`,
    };

    const apiUrl = `${endpoints[platform]}?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    // Handle different response formats
    if (data && data.url) return data;          // direct download URL
    if (data && data.data && data.data.download_url) return data.data;
    if (data && data.data && data.data.url) return data.data;
    if (typeof data === 'string' && data.startsWith('http')) return { download_url: data };
    throw new Error('No download link returned from API');
}

// YouTube search (for song titles)
async function youtubeSearch(query) {
    const { data } = await axios.get(`https://api.siputzx.my.id/api/s/ytsearch?query=${encodeURIComponent(query)}&limit=1`);
    if (data && data.data && data.data.length > 0) {
        const video = data.data[0];
        return { title: video.title, url: video.url };
    }
    throw new Error('No results found on YouTube');
}

module.exports = {
    name: 'download',
    aliases: ['dl', 'play2', 'get', 'download'],
    category: 'utility',
    description: 'Download audio/video from social media by name or link.\nUsage: .download <name/link> [audio]',
    usage: '.download Shape of You\n.download https://youtu.be/xxx\n.download https://youtu.be/xxx audio',

    async execute(sock, msg, args, context) {
        const { from, reply } = context;
        const input = args.join(' ').trim();
        if (!input) return reply('❌ Provide a song name or link.\nExample: .download Shape of You\n.download https://youtu.be/xxx audio');

        const isAudio = args.includes('audio') || input.endsWith(' audio');
        const cleanInput = input.replace(/\s*audio$/, '').trim();

        let url = cleanInput;
        // If not a URL, treat as search query → find on YouTube
        if (!/^https?:\/\//i.test(cleanInput)) {
            try {
                const searchResult = await youtubeSearch(cleanInput);
                url = searchResult.url;
                await reply(`🔍 Found: *${searchResult.title}*`);
            } catch (err) {
                return reply('❌ Could not find any YouTube video for that name.');
            }
        }

        // Now download using the link
        try {
            await sock.sendPresenceUpdate('composing', from);
            const result = await downloadMedia(url, isAudio ? 'audio' : 'video');
            const downloadUrl = result.url || result.download_url || result.data?.url || result.data?.download_url;

            if (!downloadUrl) throw new Error('Download link missing');

            if (isAudio) {
                // Send as audio (MP3)
                await sock.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mp4',
                    ptt: false,
                }, { quoted: msg });
            } else {
                // Send as video
                await sock.sendMessage(from, {
                    video: { url: downloadUrl },
                    mimetype: 'video/mp4',
                }, { quoted: msg });
            }
        } catch (err) {
            console.error('Download error:', err);
            await reply(`❌ Failed: ${err.message}`);
        } finally {
            await sock.sendPresenceUpdate('paused', from);
        }
    }
};
