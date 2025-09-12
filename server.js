import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { fileURLToPath } from "url";
import { getVideoInfo, downloadVideo } from "./utils/ytdlp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// API: fetch video info
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const info = await getVideoInfo(url);

    // Filter only mp4 or audio formats for download
    const formats = (info.formats || []).filter(f => f.ext === "mp4" || f.acodec !== "none");

    res.json({
      title: info.title,
      uploader: info.uploader || info.channel,
      thumbnail: info.thumbnail,
      duration: info.duration,
      webpage_url: info.webpage_url,
      formats: formats.map(f => ({
        itag: f.format_id,
        format: f.format,
        ext: f.ext,
        resolution: f.resolution || f.height + "p" || "audio",
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API: download video
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const format = itag || "best";
    const output = await downloadVideo(url, format);

    res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
    res.setHeader("Content-Type", "video/mp4");
    res.send(output);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
