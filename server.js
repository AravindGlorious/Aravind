// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// -----------------------------
// Middleware
// -----------------------------
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// Cookies for restricted videos
// -----------------------------
const cookiesPath = "/tmp/cookies.txt";
if (process.env.YOUTUBE_COOKIES) {
  fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
  console.log("✅ Cookies file written to", cookiesPath);
} else {
  console.warn("⚠️ YOUTUBE_COOKIES ENV variable missing!");
}

// -----------------------------
// Get video info
// -----------------------------
async function getVideoInfo(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      ffmpegLocation: ffmpegPath,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      preferFreeFormats: true,
      yesPlaylist: true
      // ✅ Removed unsupported options like https-timeout
    };
    if (fs.existsSync(cookiesPath)) options.cookies = cookiesPath;

    const json = await ytdlp(url, options);
    const primary = json?.entries?.length ? json.entries[0] : json;

    return {
      title: primary?.title || "Untitled",
      thumbnail: primary?.thumbnail || primary?.thumbnails?.[0]?.url || "",
      duration: primary?.duration || null,
      uploader: primary?.uploader || primary?.channel || "",
      webpage_url: primary?.webpage_url || url,
      formats: primary?.formats || [],
      extractor: primary?.extractor || json?.extractor,
      is_playlist: Boolean(json?.entries?.length)
    };
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err);
    throw new Error(err.message);
  }
}

// -----------------------------
// Stream download
// -----------------------------
async function streamDownload({ url, format }, res) {
  return new Promise((resolve, reject) => {
    const options = {
      format: format || "best",
      o: "-",
      ffmpegLocation: ffmpegPath,
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"]
      // ✅ No unsupported options here
    };
    if (fs.existsSync(cookiesPath)) options.cookies = cookiesPath;

    const proc = ytdlp(url, options);
    proc.stdout.pipe(res);
    proc.stderr.on("data", (chunk) => console.error("YT-DLP STDERR:", chunk.toString()));
    proc.on("close", (code) => code !== 0 ? reject(new Error(`yt-dlp exited with code ${code}`)) : resolve());
    proc.on("error", reject);
  });
}

// -----------------------------
// API Routes
// -----------------------------
app.get("/api/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.post("/api/info", async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing URL" });
  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch info", detail: err.message });
  }
});

app.get("/api/download", async (req, res) => {
  const { url, format } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  try {
    const safeName = "video";
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.mp4"`);
    res.setHeader("Content-Type", "application/octet-stream");
    await streamDownload({ url, format }, res);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Download failed", detail: err.message });
    else res.end();
  }
});

// -----------------------------
// Serve frontend
// -----------------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, "0.0.0.0", () => console.log(`✔ Server running on http://0.0.0.0:${PORT}`));
