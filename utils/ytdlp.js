import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";

const exec = util.promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temp cookies file
const COOKIES_PATH = "/tmp/cookies.txt";

// Decode Base64 cookies from env → write to /tmp/cookies.txt
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

// Run yt-dlp command
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
    "--add-header",
    "referer:youtube.com",
    "--add-header",
    "user-agent:googlebot",
  ];
  return exec(bin, fullArgs, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
}

// Get video info
export async function getVideoInfo(url) {
  try {
    const { stdout } = await runYtDlp([url, "--dump-single-json"]);
    return JSON.parse(stdout);
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    throw err;
  }
}

// Download video
export async function downloadVideo(url, format = "best") {
  const outPath = `/tmp/${Date.now()}.mp4`;
  try {
    await runYtDlp([url, "-f", format, "-o", outPath]);
    return outPath;
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    throw err;
  }
}
