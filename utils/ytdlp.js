// utils/ytdlp.js
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) console.error("stderr:", stderr);
      resolve(stdout);
    });
  });
}

// -----------------------------
// Get Video Info
// -----------------------------
export async function getVideoInfo(url, cookieFile) {
  const command = `yt-dlp "${url}" \
    --dump-single-json \
    --no-warnings \
    --no-call-home \
    --prefer-free-formats \
    --user-agent "Mozilla/5.0" \
    ${cookieFile ? `--cookies ${cookieFile}` : ""}`;

  const output = await runCommand(command);
  return JSON.parse(output);
}

// -----------------------------
// Download Video
// -----------------------------
export async function downloadVideo(url, format, cookieFile) {
  const outDir = path.join(__dirname, "../downloads");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const filePath = path.join(outDir, `video-${Date.now()}.%(ext)s`);

  const command = `yt-dlp -f "${format}" \
    -o "${filePath}" \
    "${url}" \
    --no-warnings \
    --no-call-home \
    --user-agent "Mozilla/5.0" \
    ${cookieFile ? `--cookies ${cookieFile}` : ""}`;

  await runCommand(command);

  // yt-dlp replace பண்ணும், .%(ext)s actual extension ஆகும்
  return filePath.replace("%(ext)s", "mp4");
}
