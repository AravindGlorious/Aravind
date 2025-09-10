import fs from "fs";
import { execa } from "execa";

let cookieFile = null;

// Decode cookies from ENV → write to /tmp
if (process.env.YOUTUBE_COOKIES) {
  try {
    const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, "base64").toString("utf-8");
    cookieFile = "/tmp/cookies.txt"; // Render tmp dir
    fs.writeFileSync(cookieFile, decoded);
    console.log("✅ Cookies file created at", cookieFile);
  } catch (err) {
    console.error("❌ Failed to decode cookies:", err.message);
  }
}

/**
 * Get video info (title, thumbnail, duration, etc.)
 */
export async function getVideoInfo(url) {
  try {
    const args = [
      url,
      "--dump-single-json",
      "--no-warnings",
      "--no-call-home",
      "--prefer-free-formats",
      "--add-header", "referer:youtube.com",
      "--add-header", "user-agent:googlebot"
    ];

    if (cookieFile) {
      args.push("--cookies", cookieFile);
    }

    const { stdout } = await execa("yt-dlp", args, { timeout: 60000 });
    return JSON.parse(stdout);
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err);
    throw err;
  }
}

/**
 * Download video and return saved file path
 */
export async function downloadVideo(url, format = "best") {
  try {
    const output = "/tmp/video.%(ext)s";
    const args = [
      url,
      "-f", format,
      "-o", output,
    ];

    if (cookieFile) {
      args.push("--cookies", cookieFile);
    }

    await execa("yt-dlp", args, { timeout: 0 }); // no timeout for large files

    // By default output = /tmp/video.mp4
    return "/tmp/video.mp4";
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err);
    throw err;
  }
}
