// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import ytdlp from "yt-dlp-exec";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Render will inject the correct port

// -----------------------------
// Middleware
// -----------------------------
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

// -----------------------------
// Cookies setup (optional)
// -----------------------------
const cookiesPath = "/tmp/cookies.txt";
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
    console.log("✅ Cookies file written to", cookiesPath);
  } catch (err) {
    console.error("❌ Failed to write cookies file:", err.message);
  }
} else {
  console.warn("⚠️ YOUTUBE_COOKIES ENV variable not found. Restricted videos may fail.");
}

// -----------------------------
// Get Video Info
// -----------------------------
async function getVideoInfo(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
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
      extractor: primary?.extractor || json?.extractor,
      is_playlist: Boolean(json?.entries?.length),
    };
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// -----------------------------
// Stream Download
// -----------------------------
async function streamDownload({ url, format = "best" }, res) {
  return new Promise((resolve, reject) => {
    const options = {
      format,
      o: "-",
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    };
    if (fs.existsSync(cookiesPath)) options.cookies = cookiesPath;

    const proc = ytdlp(url, options);
    proc.stdout.pipe(res);

    proc.stderr.on("data", (chunk) => {
      console.error("YT-DLP STDERR:", chunk.toString());
    });

    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`yt-dlp exited with code ${code}`));
      else resolve();
    });

    proc.on("error", reject);
  });
}

// -----------------------------
// Health Check
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// -----------------------------
// Info Endpoint
// -----------------------------
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

// -----------------------------
// Download Endpoint
// -----------------------------
app.get("/api/download", async (req, res) => {
  const { url, format = "best" } = req.query;
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
// Serve Frontend
// -----------------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✔ Server running on http://0.0.0.0:${PORT}`);
});
