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
    const raw = await ytDlp(url, {
      ...ytDlpOptions,
      dumpSingleJson: true,
      encoding: "utf8",
    });

    const info = JSON.parse(raw);

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
      error: "Failed to fetch video info. May require cookies.",
      details: err.message,
    });
  }
});

// ===== /api/download =====
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url || !itag) return res.status(400).json({ error: "URL & itag required" });

  try {
    res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
    res.setHeader("Content-Type", "video/mp4");

    const proc = ytDlp.exec(url, {
      ...ytDlpOptions,
      format: itag,
      output: "-", // stream to stdout
    });

    proc.stdout.pipe(res);
    proc.stderr.on("data", (d) => console.log("yt-dlp:", d.toString()));
    proc.on("error", (err) => {
      console.error("yt-dlp error:", err);
      res.status(500).end("Download failed");
    });
  } catch (err) {
    console.error("yt-dlp download error:", err.message);
    res.status(500).json({
      error: "Download failed.",
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
