import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { getVideoInfo, downloadVideo } from "./utils/ytdlp.js";

const app = express();
const PORT = process.env.PORT || 10000;

// __dirname fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form POST
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// API → Get video info
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing video URL" });

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch video info", details: err.message });
  }
});

// API → Download video (streaming)
app.post("/api/download", async (req, res) => {
  try {
    const { url, format } = req.body;
    if (!url) return res.status(400).json({ error: "Missing video URL" });

    const filePath = await downloadVideo(url, format || "best");
    const fileName = `${Date.now()}${format === "audio" ? ".mp3" : ".mp4"}`;

    res.download(filePath, fileName, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(filePath, () => {}); // Delete temp file after sending
    });
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    res.status(500).json({ error: "Failed to download video", details: err.message });
  }
});

// Fallback to frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
