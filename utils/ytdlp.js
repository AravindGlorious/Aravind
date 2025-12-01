import ytdlp from "yt-dlp-exec";
import fs from "fs";
import { spawn } from "child_process";

// Default options to avoid warnings and ensure proper headers
const defaultOptions = {
  noWarnings: true,
  noCallHome: true,
  preferFreeFormats: true,
  addHeader: [
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    "referer: https://www.youtube.com/",
  ],
  cookies: fs.existsSync("cookies.txt") ? "cookies.txt" : undefined,  // Using cookies.txt if it exists
};

// 🔹 Get video info with improved error handling and logging
export async function getInfo(url) {
  try {
    // Fetch video info
    let info = await ytdlp(url, {
      ...defaultOptions,
      dumpSingleJson: true,  // Retrieve info in JSON format
      encoding: "utf8",  // Ensure UTF-8 encoding for the output
    });

    // If the info is returned as a string, try parsing it as JSON
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

    // Log the raw info for debugging
    console.log("Video info:", info);

    // Extract thumbnail from metadata, use a placeholder if not available
    const thumb =
      info.thumbnail ||
      (info.thumbnails && info.thumbnails[0]?.url) ||
      "placeholder_thumbnail_url_here.jpg";

    return {
      title: info.title || "Untitled Video",
      uploader: info.uploader || "Unknown",
      duration: info.duration || null,
      webpage_url: info.webpage_url || url,
      thumbnail: thumb,
      formats: (info.formats || []).map(f => ({
        itag: f.format_id,
        resolution: f.height ? `${f.height}p` : f.format_note || "audio",
        ext: f.ext,
        url: f.url,
      })),
    };
  } catch (err) {
    console.error("yt-dlp getInfo error:", err);

    // If it's a network or login issue, provide more specific feedback
    if (err.message.includes("Restricted") || err.message.includes("login")) {
      throw new Error(
        "This video may be restricted or require login. Please check your cookies."
      );
    }

    throw new Error(
      "Failed to fetch video info. Please check the URL and ensure yt-dlp is up-to-date."
    );
  }
}

// 🔹 Download video to file with error handling
export async function downloadVideo(url, itag, outputPath) {
  try {
    // Start downloading the video with the selected format
    await ytdlp(url, {
      ...defaultOptions,
      format: itag,  // Select the video format
      output: outputPath,  // Set the output path for saving the file
    });
    return true;
  } catch (err) {
    console.error("yt-dlp download error:", err);
    throw new Error("Failed to download video. Please check the URL or format.");
  }
}

// 🔹 Stream download directly (no file storage) with enhanced error handling
export function streamDownload(url, itag, res) {
  try {
    // Spawn yt-dlp process to fetch and stream the video
    const ytdlpProc = spawn("yt-dlp", ["-f", itag, "-o", "-", url]);

    // Automatically adjust Content-Type based on file extension (e.g., video/mp4 or video/webm)
    ytdlpProc.stdout.on("data", (data) => {
      const ext = itag.includes("mp4") ? "mp4" : "webm"; // Fallback to 'webm' for other formats
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="video_${itag}.${ext}"`
      );
      res.setHeader("Content-Type", `video/${ext}`);
    });

    // Pipe video data to the response
    ytdlpProc.stdout.pipe(res);

    // Log errors from stderr stream for debugging
    ytdlpProc.stderr.on("data", (data) => {
      console.error("yt-dlp error:", data.toString());
    });

    // Log when the yt-dlp process ends
    ytdlpProc.on("close", (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
    });
  } catch (err) {
    console.error("yt-dlp stream error:", err);
    res.status(500).json({ error: "Failed to stream video. Please try again later." });
  }
}

