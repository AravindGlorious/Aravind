import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import ytDlp from "yt-dlp-exec"; // npm install yt-dlp-exec

const app = express();
const port = process.env.PORT || 5000;

// ===== Middlewares =====
app.use(cors());
app.use(bodyParser.json());

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cookies (optional for restricted YouTube videos)
const cookiesFile = path.join(__dirname, "cookies.txt");
const ytDlpOptions = {
  noWarnings: true,
  noCallHome: true,
  preferFreeFormats: true,
  addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  cookies: fs.existsSync(cookiesFile) ? cookiesFile : undefined,
};

// ===== /api/info =====
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const info = await ytDlp(url, {
      ...ytDlpOptions,
      dumpSingleJson: true,
    });

    const response = {
      title: info.title,
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      duration: info.duration,
      webpage_url: info.webpage_url,
      formats: info.formats?.map((f) => ({
        itag: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : f.format_note || "audio"),
        acodec: f.acodec,
        vcodec: f.vcodec,
        filesize: f.filesize || f.filesize_approx || null,
      })) || [],
    };

    res.json(response);
  } catch (err) {
    console.error("yt-dlp info error:", err.message);
    res.status(500).json({
      error:
        "Failed to fetch video info. It might be restricted or require cookies.",
      details: err.message,
    });
  }
});

// ===== /api/download =====
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url || !itag) return res.status(400).json({ error: "URL & itag required" });

  const tempFile = path.join(__dirname, `temp_${Date.now()}.mp4`);

  try {
    await ytDlp(url, {
      ...ytDlpOptions,
      format: itag,
      output: tempFile,
    });

    res.download(tempFile, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(tempFile, () => {}); // cleanup temp file
    });
  } catch (err) {
    console.error("yt-dlp download error:", err.message);
    res.status(500).json({
      error: "Download failed. Video may be restricted or invalid.",
      details: err.message,
    });
  }
});

// ===== Serve frontend =====
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== Start Server =====
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
