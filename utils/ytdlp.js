import ytdlp from "yt-dlp-exec";
import fs from "fs";

// Common yt-dlp options
const defaultOptions = {
  noWarnings: true,
  noCallHome: true,
  preferFreeFormats: true,
  addHeader: [
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    "referer: https://www.youtube.com/"
  ],
  cookies: fs.existsSync("cookies.txt") ? "cookies.txt" : undefined
};

// 🔹 Get video info
export async function getInfo(url) {
  try {
    const info = await ytdlp(url, {
      ...defaultOptions,
      dumpSingleJson: true
    });

    let thumb =
      info.thumbnail ||
      (info.thumbnails && info.thumbnails[0]?.url) ||
      null;

    return {
      title: info.title || "Untitled Video",
      uploader: info.uploader || "Unknown",
      duration: info.duration || null,
      webpage_url: info.webpage_url || url,
      thumbnail: thumb,
      formats: info.formats?.map(f => ({
        itag: f.format_id,
        resolution: f.height ? `${f.height}p` : f.format_note || "audio",
        ext: f.ext,
        url: f.url
      })) || []
    };
  } catch (err) {
    console.error("yt-dlp getInfo error:", err);
    throw new Error("Failed to fetch video info");
  }
}

// 🔹 Download video to a file
export async function downloadVideo(url, itag, outputPath) {
  try {
    await ytdlp(url, {
      ...defaultOptions,
      format: itag,
      output: outputPath
    });
    return true;
  } catch (err) {
    console.error("yt-dlp download error:", err);
    throw new Error("Failed to download video");
  }
}
