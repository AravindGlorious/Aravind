import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getVideoInfo, downloadVideo } from "./utils/ytdlp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DOWNLOAD_DIR = path.join(__dirname, "downloads");

// Ensure downloads folder exists
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// Cleanup old files every hour
setInterval(() => {
  fs.readdir(DOWNLOAD_DIR, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => {
      const filePath = path.join(DOWNLOAD_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const age = Date.now() - stats.mtimeMs;
        if (age > 1000 * 60 * 60) { // 1 hour
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 1000 * 60 * 60); // every hour

// -------------------
// API: Video Info
// -------------------
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error("Error fetching video info:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// API: Download
// -------------------
app.post("/api/download", async (req, res) => {
  const { url, format } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const filePath = await downloadVideo(url, format, DOWNLOAD_DIR);
    res.download(filePath, err => {
      if (err) console.error(err);
      // Optionally delete after sending
      // fs.unlink(filePath, () => {});
    });
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on http://0.0.0.0:${PORT}`));
