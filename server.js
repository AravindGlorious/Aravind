// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getVideoInfo, downloadVideo } from "./utils/ytdlp.js";

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 📂 Downloads folder path
const downloadsDir = path.join(__dirname, "downloads");

// Create downloads folder if not exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

// 🧹 Cleanup old files (>1hr)
setInterval(() => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const now = Date.now();
        const fileAge = (now - stats.mtimeMs) / 1000;
        if (fileAge > 3600) {
          fs.unlink(filePath, () => {
            console.log(`🗑 Deleted old file: ${file}`);
          });
        }
      });
    });
  });
}, 30 * 60 * 1000); // run every 30 mins

// Routes
app.get("/api/info", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/download", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(downloadsDir, fileName);

    await downloadVideo(url, filePath);

    res.download(filePath, fileName, err => {
      if (err) console.error("Download error:", err);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
