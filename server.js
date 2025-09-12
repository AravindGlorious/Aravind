// server.js
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

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// -----------------------------
// API: Get video info
// -----------------------------
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const info = await getVideoInfo(url);

    // Detect login required for YouTube
    if (info?.error && info.error.includes("login")) {
      return res.status(403).json({
        error: "YouTube login required",
        title: info.title,
        thumbnail: info.thumbnail,
      });
    }

    res.json({
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      webpage_url: info.webpage_url,
      formats: info.formats || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// API: Download video
// -----------------------------
app.post("/api/download", async (req, res) => {
  const { url, format } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const filePath = await downloadVideo(url, format || "best");
    const fileName = path.basename(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) console.error("Download error:", err);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback for frontend routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
