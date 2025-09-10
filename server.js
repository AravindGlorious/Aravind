import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { spawn } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

// __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Cookies file path
const COOKIES_PATH = "/tmp/cookies.txt";

// ----------------------
// Helper → write cookies.txt if env exists
// ----------------------
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

// ----------------------
// API → Get video info
// ----------------------
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL" });

  ensureCookiesFile();

  const args = [
    url,
    "--dump-single-json",
    "--no-warnings",
    "--no-call-home",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  ];

  if (fs.existsSync(COOKIES_PATH)) {
    args.push("--cookies", COOKIES_PATH);
  }

  const ytdlp = spawn("yt-dlp", args);

  let data = "";
  let errData = "";

  ytdlp.stdout.on("data", (chunk) => (data += chunk));
  ytdlp.stderr.on("data", (chunk) => (errData += chunk));

  ytdlp.on("close", (code) => {
    if (code === 0) {
      try {
        res.json(JSON.parse(data));
      } catch (err) {
        res.status(500).json({ error: "Invalid JSON from yt-dlp" });
      }
    } else {
      console.error("YT-DLP INFO ERROR:", errData);
      res.status(500).json({ error: "Failed to fetch video info", details: errData });
    }
  });
});

// ----------------------
// API → Download video
// ----------------------
app.post("/api/download", (req, res) => {
  const { url, format } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL" });

  ensureCookiesFile();

  const args = [
    url,
    "-f",
    format || "best",
    "-o",
    "-",
    "--no-warnings",
    "--no-call-home",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  ];

  if (fs.existsSync(COOKIES_PATH)) {
    args.push("--cookies", COOKIES_PATH);
  }

  const ytdlp = spawn("yt-dlp", args);

  res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
  res.setHeader("Content-Type", "video/mp4");

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (chunk) => {
    console.error("YT-DLP DOWNLOAD ERROR:", chunk.toString());
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      console.error("Download failed with code:", code);
    }
  });
});

// ----------------------
// Health check
// ----------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ----------------------
// Fallback → serve frontend
// ----------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
