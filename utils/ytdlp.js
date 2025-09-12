// utils/ytdlp.js
import ytdlp from 'yt-dlp-exec';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt'); // Put your cookies.txt here

// Ensure downloads folder exists
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// Auto-cleanup files older than 1 hour
function cleanupDownloads() {
  const files = fs.readdirSync(DOWNLOAD_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(DOWNLOAD_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 3600 * 1000) fs.unlinkSync(filePath);
  });
}

// -----------------------------
// Get video info
// -----------------------------
export async function getVideoInfo(url) {
  cleanupDownloads();
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
      cookies: COOKIES_FILE,
    });
    return info;
  } catch (err) {
    throw new Error(err.stderr || err.message);
  }
}

// -----------------------------
// Download video
// -----------------------------
export async function downloadVideo(url, format = 'best') {
  cleanupDownloads();
  const outputFile = path.join(DOWNLOAD_DIR, `video_${Date.now()}.%(ext)s`);

  try {
    await ytdlp(url, {
      format,
      output: outputFile,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
      cookies: COOKIES_FILE,
    });

    // Return the newest file in downloads folder
    const downloadedFile = fs.readdirSync(DOWNLOAD_DIR)
      .map(f => path.join(DOWNLOAD_DIR, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

    return downloadedFile;
  } catch (err) {
    throw new Error(err.stderr || err.message);
  }
}
