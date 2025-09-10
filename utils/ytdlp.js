// utils/ytdlp.js
import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";

// cookies path
const cookieFile = "/tmp/cookies.txt";

// downloads folder
const downloadDir = path.join(process.cwd(), "downloads");

// Ensure downloads dir exists
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

// Function to clean old files (>1 hour old)
function cleanOldFiles() {
  fs.readdir(downloadDir, (err, files) => {
    if (err) return;
    files.forEach((file) => {
      const filePath = path.join(downloadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const now = Date.now();
        const age = now - stats.mtimeMs;
        if (age > 60 * 60 * 1000) {
          // older than 1 hour
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

// Run cleanup every 30 mins
setInterval(cleanOldFiles, 30 * 60 * 1000);

// Main function
export async function downloadInfo(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      cookies: cookieFile, // ✅ cookies file
    });
    return info;
  } catch (error) {
    console.error("yt-dlp error:", error.message);
    throw error;
  }
}

export async function downloadVideo(url, format = "mp4") {
  try {
    const output = path.join(downloadDir, `video-%(id)s.%(ext)s`);
    await ytdlp(url, {
      format: "bestvideo+bestaudio/best",
      output,
      mergeOutputFormat: format,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      cookies: cookieFile, // ✅ cookies file
    });
    return output;
  } catch (error) {
    console.error("yt-dlp download error:", error.message);
    throw error;
  }
}
