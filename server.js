import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import ytdlp from "yt-dlp-exec";

const app = express();
const port = process.env.PORT || 5000;

// ===== Middlewares =====
app.use(cors());
app.use(bodyParser.json());

// ===== Paths =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cookiesFile = path.join(__dirname, "cookies.txt");

// ===== yt-dlp Options =====
const ytDlpOptions = {
  noWarnings: true,
  noCallHome: true,
  preferFreeFormats: true,
  addHeader: [
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    "referer: https://www.youtube.com/",
  ],
  cookies: fs.existsSync(cookiesFile) ? cookiesFile : undefined,
};

// ===== /api/info =====
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // Fetch video info
    let info = await ytdlp(url, { ...ytDlpOptions, dumpSingleJson: true });

    // Ensure info is an object
    if (typeof info === "string") info = JSON.parse(info);

    const response = {
      title: info.title || "Untitled Video",
      uploader: info.uploader || "Unknown",
      duration: info.duration || null,
      webpage_url: info.webpage_url || url,
      thumbnail:
        info.thumbnail ||
        (info.thumbnails && info.thumbnails[0]?.url) ||
        null,
      formats:
        info.formats?.map((f) => ({
          itag: f.format_id,
          resolution: f.height
            ? `${f.height}p`
            : f.format_note || "audio",
          ext: f.ext,
          acodec: f.acodec,
          vcodec: f.vcodec,
          filesize: f.filesize || f.filesize_approx || null,
        })) || [],
    };

    res.json(response);
  } catch (err) {
    console.error("yt-dlp getInfo error:", err);
    res.status(500).json({
      error:
        "Failed to fetch video info. Restricted / login-required videos may need cookies.",
      details: err.message,
    });
  }
});

// ===== /api/download =====
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url || !itag)
    return res.status(400).json({ error: "URL & itag required" });

  try {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="video_${itag}.mp4"`
    );
    res.setHeader("Content-Type", "video/mp4");

    // Stream download directly
    const proc = ytdlp.exec(url, {
      ...ytDlpOptions,
      format: itag,
      output: "-", // stream to stdout
    });

    proc.stdout.pipe(res);
    proc.stderr.on("data", (d) => console.error("yt-dlp:", d.toString()));
    proc.on("error", (err) => {
      console.error("yt-dlp download error:", err);
      res.status(500).end("Download failed");
    });
  } catch (err) {
    console.error("yt-dlp error:", err);
    res.status(500).json({ error: "Download failed", details: err.message });
  }
});

// ===== Serve frontend =====
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// ===== Start Server =====
app.listen(port, () =>
  console.log(`🚀 Server running at http://localhost:${port}`)
);
