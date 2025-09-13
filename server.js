import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ytDlp from "yt-dlp-exec"; // npm install yt-dlp-exec

const app = express();
const port = process.env.PORT || 5000;

// ====== Middlewares ======
app.use(cors());
app.use(bodyParser.json());

// Helper paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== /api/info ======
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const info = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    });

    // Filter useful fields
    const response = {
      title: info.title,
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      duration: info.duration,
      webpage_url: info.webpage_url,
      formats: info.formats.map((f) => ({
        itag: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : null),
        acodec: f.acodec,
        vcodec: f.vcodec,
        filesize: f.filesize || f.filesize_approx || null,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error("yt-dlp info error:", err);
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

// ====== /api/download ======
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url || !itag) return res.status(400).json({ error: "URL & itag required" });

  try {
    const tempFile = path.join(__dirname, `temp_${Date.now()}.mp4`);

    // Download with yt-dlp
    await ytDlp(url, {
      format: itag,
      output: tempFile,
    });

    // Stream file to client
    res.download(tempFile, (err) => {
      if (err) console.error("Download stream error:", err);
      fs.unlink(tempFile, () => {}); // cleanup temp file
    });
  } catch (err) {
    console.error("yt-dlp download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// ====== Start Server ======
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
