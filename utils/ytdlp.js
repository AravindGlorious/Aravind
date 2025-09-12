import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt'); // <- your cookies.txt

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanupDownloads() {
  const files = fs.readdirSync(DOWNLOAD_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(DOWNLOAD_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 3600 * 1000) fs.unlinkSync(filePath);
  });
}

function buildCommand(url, extraArgs = '') {
  return [
    `"${path.join(process.cwd(), 'node_modules', '.bin', 'yt-dlp')}"`,
    url,
    '--no-warnings',
    '--no-call-home',
    '--prefer-free-formats',
    `--add-header referer:youtube.com`,
    `--add-header user-agent:Mozilla/5.0`,
    `--cookies "${COOKIES_FILE}"`,
    extraArgs
  ].join(' ');
}

export function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    cleanupDownloads();
    const cmd = buildCommand(url, '--dump-single-json');
    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch {
        reject(new Error('Failed to parse video info JSON'));
      }
    });
  });
}

export function downloadVideo(url, format = 'best') {
  return new Promise((resolve, reject) => {
    cleanupDownloads();
    const outputFile = path.join(DOWNLOAD_DIR, `video_${Date.now()}.%(ext)s`);
    const cmd = buildCommand(url, `-f ${format} -o "${outputFile}"`);

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));

      const matched = stdout.match(/Destination: (.+)/);
      if (matched && matched[1]) return resolve(matched[1].trim());

      const files = fs.readdirSync(DOWNLOAD_DIR).map(f => path.join(DOWNLOAD_DIR, f));
      const newest = files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
      resolve(newest);
    });
  });
}
