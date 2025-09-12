// utils/ytdlp.js
import ytdlp from 'yt-dlp-exec';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Auto-cleanup: delete files older than 1 hour
function cleanupDownloads() {
  const files = fs.readdirSync(DOWNLOAD_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(DOWNLOAD_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 3600 * 1000) fs.unlinkSync(filePath);
  });
}

// Get video info
export async function getVideoInfo(url) {
  cleanupDownloads();

  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
      cookies: fs.existsSync(COOKIES_FILE) ? COOKIES_FILE : undefined,
    });
    return info;
  } catch (err) {
    console.error('YT-DLP INFO ERROR:', err.stderr || err.message);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// Download video
export async function downloadVideo(url, format = 'best') {
  cleanupDownloads();

  const outputFile = path.join(DOWNLOAD_DIR, `video_${Date.now()}.%(ext)s`);

  try {
    const info = await ytdlp(url, {
      format,
      ffmpegLocation: 'ffmpeg', // ffmpeg-static installed automatically
      noWarnings: true,
      noCallHome: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
      cookies: fs.existsSync(COOKIES_FILE) ? COOKIES_FILE : undefined,
      output: outputFile,
    });

    // yt-dlp-exec returns the file path automatically
    const files = fs.readdirSync(DOWNLOAD_DIR).map(f => path.join(DOWNLOAD_DIR, f));
    const newest = files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    return newest;
  } catch (err) {
    console.error('YT-DLP DOWNLOAD ERROR:', err.stderr || err.message);
    throw new Error(`Failed to download: ${err.message}`);
  }
}
