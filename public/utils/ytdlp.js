import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

// ✅ Optional cookies (only if provided in Render env)
let cookieFile = null;
if (process.env.YOUTUBE_COOKIES) {
  try {
    const cookiePath = "/tmp/cookies.txt";
    fs.writeFileSync(cookiePath, process.env.YOUTUBE_COOKIES);
    cookieFile = cookiePath;
    console.log("✅ Cookies file written:", cookiePath);
  } catch (e) {
    console.error("❌ Failed to write cookies:", e.message);
  }
}

// Get video info
export async function getVideoInfo(url) {
  const args = [
    url,
    "--dump-single-json",
    "--no-warnings",
    "--no-call-home",
    "--prefer-free-formats",
    "--add-header", "referer:youtube.com",
    "--add-header", "user-agent:googlebot",
  ];

  if (cookieFile) args.push("--cookies", cookieFile);

  return await ytdlp(args, { shell: true });
}

// Download video
export async function downloadVideo(url, format = "mp4") {
  const outputPath = path.resolve(`downloads/video.${format}`);

  const args = [
    url,
    "-f", "best",
    "-o", outputPath,
    "--ffmpeg-location", ffmpegPath,
  ];

  if (cookieFile) args.push("--cookies", cookieFile);

  await ytdlp(args, { shell: true });

  return outputPath;
}
