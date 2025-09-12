import { execFile } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ytdlp from "yt-dlp-exec";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------
// Get Video Info
// -------------------
export async function getVideoInfo(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"]
    });
    return info;
  } catch (err) {
    throw err;
  }
}

// -------------------
// Download Video
// -------------------
export async function downloadVideo(url, format, downloadDir) {
  const fileName = `video_${Date.now()}.${format === "audio" ? "mp3" : "mp4"}`;
  const filePath = path.join(downloadDir, fileName);

  const options = {
    output: filePath,
    format: format === "audio" ? "bestaudio[ext=m4a]" : "bestvideo+bestaudio/best",
    noWarnings: true,
    addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
  };

  if (format === "audio") options.extractAudio = true;
  await ytdlp(url, options);

  return filePath;
}
