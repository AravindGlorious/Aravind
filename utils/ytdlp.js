// utils/ytdlp.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

function cleanupDownloads() {
  const files = fs.readdirSync(DOWNLOAD_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(DOWNLOAD_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 3600 * 1000) fs.unlinkSync(filePath);
  });
}

// Get video info
export function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    cleanupDownloads();

    const cmd = [
      `"${path.join(process.cwd(), 'node_modules', '.bin', 'yt-dlp')}"`,
      url,
      '--dump-single-json',
      '--no-warnings',
      '--no-call-home',
      '--prefer-free-formats',
      `--add-header referer:youtube.com`,
      `--add-header user-agent:Mozilla/5.0`,
      `--cookies "${COOKIES_FILE}"`,
    ].join(' ');

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        // Check if YouTube requires login
        if (stderr && stderr.includes("Sign in to confirm you’re not a bot")) {
          return reject(new Error("YouTube requires login for this video. Cannot download."));
        }
        return reject(new Error(stderr || err.message));
      }

      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch {
        reject(new Error('Failed to parse video info JSON'));
      }
    });
  });
}

// Download video
export function downloadVideo(url, format = 'best') {
  return new Promise((resolve, reject) => {
    cleanupDownloads();

    const outputFile = path.join(DOWNLOAD_DIR, `video_${Date.now()}.%(ext)s`);

    const cmd = [
      `"${path.join(process.cwd(), 'node_modules', '.bin', 'yt-dlp')}"`,
      url,
      `-f ${format}`,
      `-o "${outputFile}"`,
      '--no-warnings',
      '--no-call-home',
      '--prefer-free-formats',
      `--add-header referer:youtube.com`,
      `--add-header user-agent:Mozilla/5.0`,
      `--cookies "${COOKIES_FILE}"`,
    ].join(' ');

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        if (stderr && stderr.includes("Sign in to confirm you’re not a bot")) {
          return reject(new Error("YouTube requires login for this video. Cannot download."));
        }
        return reject(new Error(stderr || err.message));
      }

      const downloadedFile = stdout.match(/Destination: (.+)/);
      if (downloadedFile && downloadedFile[1]) {
        resolve(downloadedFile[1].trim());
      } else {
        const files = fs.readdirSync(DOWNLOAD_DIR).map(f => path.join(DOWNLOAD_DIR, f));
        const newest = files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
        resolve(newest);
      }
    });
  });
}
