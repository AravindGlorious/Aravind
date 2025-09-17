import ytdlp from "yt-dlp-exec";
import fs from "fs";
import { spawn } from "child_process";

const defaultOptions = {
  noWarnings: true,
  noCallHome: true,
  preferFreeFormats: true,
  addHeader: [
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    "referer: https://www.youtube.com/",
  ],
  cookies: fs.existsSync("cookies.txt") ? "cookies.txt" : undefined,
};

// 🔹 Get video info
export async function getInfo(url) {
  try {
    let info = await ytdlp(url, {
      ...defaultOptions,
      dumpSingleJson: true,
      encoding: "utf8",  // make sure string output is UTF-8
    });

    // Force JSON parse if string
    if (typeof info === "string") {
      try {
        info = JSON.parse(info);
      } catch (e) {
        console.error("yt-dlp returned invalid JSON:", info);
        throw new Error(
          "yt-dlp output invalid. Restricted / login-required videos may need cookies."
        );
      }
    }

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
      formats:
        info.formats?.map((f) => ({
          itag: f.format_id,
          resolution: f.height
            ? `${f.height}p`
            : f.format_note || "audio",
          ext: f.ext,
          url: f.url,
        })) || [],
    };
  } catch (err) {
    console.error("yt-dlp getInfo error:", err);
    throw new Error(
      "Failed to fetch video info. Restricted / login-required videos may need cookies."
    );
  }
}

// 🔹 Download video to file
export async function downloadVideo(url, itag, outputPath) {
  try {
    await ytdlp(url, {
      ...defaultOptions,
      format: itag,
      output: outputPath,
    });
    return true;
  } catch (err) {
    console.error("yt-dlp download error:", err);
    throw new Error("Failed to download video");
  }
}

// 🔹 Stream download directly (no file storage)
export function streamDownload(url, itag, res) {
  try {
    const ytdlpProc = spawn("yt-dlp", ["-f", itag, "-o", "-", url]);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="video_${itag}.mp4"`
    );
    res.setHeader("Content-Type", "video/mp4");

    ytdlpProc.stdout.pipe(res);

    ytdlpProc.stderr.on("data", (data) => {
      console.error("yt-dlp error:", data.toString());
    });

    ytdlpProc.on("close", (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
    });
  } catch (err) {
    console.error("yt-dlp stream error:", err);
    res.status(500).json({ error: "Failed to stream video" });
  }
}
