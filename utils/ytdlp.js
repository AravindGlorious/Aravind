import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";

// ✅ Create cookies.txt from ENV variable (for YouTube login-protected videos)
const cookiesPath = path.join(process.cwd(), "cookies.txt");
if (process.env.YOUTUBE_COOKIES) {
  fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
}

// Ensure downloads directory exists
const downloadsDir = path.join(process.cwd(), "downloads");
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

/**
 * Fetch video info from YouTube (or other supported platforms)
 * @param {string} url - Video URL
 * @returns {Promise<Object>} Video info JSON
 */
export async function getVideoInfo(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: process.env.YOUTUBE_COOKIES ? cookiesPath : undefined,
    });
    return info;
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    throw err;
  }
}

/**
 * Download video to downloads folder
 * @param {string} url - Video URL
 * @param {string} format - Format code (default: best)
 * @returns {Promise<string>} File path of downloaded video
 */
export async function downloadVideo(url, format = "best") {
  try {
    const output = path.join(downloadsDir, "%(title)s.%(ext)s");

    const filePath = await ytdlp(url, {
      format,
      output,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: process.env.YOUTUBE_COOKIES ? cookiesPath : undefined,
    });

    return filePath;
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    throw err;
  }
}
