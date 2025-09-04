# QuickDownload — Premium Fast HD Downloader

> **Important**: Use this service only for content you own or have permission to download. Respect platform terms and laws.

## Features
- Professional SEO homepage (Tailwind CDN)
- Node.js + Express backend
- `yt-dlp` streaming download (best/original quality)
- Info preview (title, thumbnail, duration)
- Terms & Privacy pages

## Requirements
- Node.js 18+
- `yt-dlp` installed in system path
  - **Linux/macOS**: `python3 -m pip install -U yt-dlp`
  - **Debian/Ubuntu**: `sudo apt-get install -y ffmpeg` (recommended for muxing)
  - **Windows**: download yt-dlp.exe and ensure it’s in PATH
- (Optional) `ffmpeg` for merging bestvideo+bestaudio

## Local Setup
```bash
npm install
# Ensure yt-dlp works
yt-dlp -v
# Start server
npm run start
# Open http://localhost:3000
