import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";

const exec = util.promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIES_PATH = "/tmp/cookies.txt";

// Write Base64 cookies from env to /tmp/cookies.txt
function ensureCookiesFile() {
  if (process.env.YOUTUBE_COOKIES) {
    try {
      const buf = Buffer.from(process.env.YOUTUBE_COOKIES, "base64");
      fs.writeFileSync(COOKIES_PATH, buf.toString("utf-8"));
      console.log("✅ Cookies file written to /tmp/cookies.txt");
    } catch (err) {
      console.error("❌ Failed to decode YOUTUBE_COOKIES:", err.message);
    }
  }
}

// Run yt-dlp with proper arguments
async function runYtDlp(args) {
  ensureCookiesFile();
  const bin = path.join(__dirname, "../node_modules/yt-dlp-exec/bin/yt-dlp");
  const fullArgs = [
    ...args,
    "--cookies",
    COOKIES_PATH,
    "--no-warnings",
    "--no-call-home",
    "--prefer-free-formats",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  ];
  return exec(bin, fullArgs, { maxBuffer: 1024 * 1024 * 10 });
}

// Get video info
export async function getVideoInfo(url) {
  try {
    const { stdout } = await runYtDlp([url, "--dump-single-json"]);
    return JSON.parse(stdout);
  } catch (err) {
    if (err.message.includes("Sign in to confirm")) {
      throw new Error(
        "This video requires YouTube login or is restricted. Update your YOUTUBE_COOKIES."
      );
    }
    throw err;
  }
}

// Download video
export async function downloadVideo(url, format = "best") {
  const outPath = `/tmp/${Date.now()}.${format === "audio" ? "mp3" : "mp4"}`;
  const ytdlpArgs = ["-o", outPath, url];

  if (format === "audio") {
    ytdlpArgs.push("-f", "bestaudio", "--extract-audio", "--audio-format", "mp3");
  } else {
    ytdlpArgs.push("-f", format);
  }

  try {
    await runYtDlp(ytdlpArgs);
    return outPath;
  } catch (err) {
    if (err.message.includes("Sign in to confirm")) {
      throw new Error(
        "Cannot download: video requires YouTube login or is restricted. Update your YOUTUBE_COOKIES."
      );
    }
    throw err;
  }
}
