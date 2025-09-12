// utils/ytdlp.js
import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";

// Fetch video info
export async function getVideoInfo(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      ffmpegLocation: ffmpegPath,
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    });
    return info;
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// Download video to memory (stream)
export async function downloadVideo(url, format = "best") {
  try {
    const output = await ytdlp(url, {
      format,
      ffmpegLocation: ffmpegPath,
      o: "-", // stdout
      noWarnings: true,
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    });
    return output;
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    throw new Error(`Failed to download: ${err.message}`);
  }
}
