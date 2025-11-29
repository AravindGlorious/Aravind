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

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cookiesFile = path.join(__dirname, "cookies.txt");

// yt-dlp options
const ytDlpOptions = {
  noWarnings: true,
  preferFreeFormats: true,
  addHeader: [
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    "referer: https://www.youtube.com/",
  ],
  cookies: fs.existsSync(cookiesFile) ? cookiesFile : undefined,  // Use cookies file if exists
};

// ===== /api/info =====
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const raw = await ytdlp(url, {
      ...ytDlpOptions,
      dumpSingleJson: true,
      encoding: "utf8",
    });

    let info;
    if (typeof raw === "string") {
      try {
        info = JSON.parse(raw);
      } catch {
        return res.status(403).json({
          error: "Video may be restricted. Login/cookies required.",
          message:
            "Update your cookies.txt or export fresh cookies from your browser.",
        });
      }
    } else {
      info = raw;
    }

    res.json({
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      webpage_url: info.webpage_url,
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url),
      formats: info.formats?.map((f) => ({
        itag: f.format_id,
        ext: f.ext,
        resolution: f.height ? `${f.height}p` : f.format_note || "audio",
        acodec: f.acodec,
        vcodec: f.vcodec,
        filesize: f.filesize || f.filesize_approx || null,
      })) || [],
    });
  } catch (err) {
    console.error("yt-dlp info error:", err.message);
    res.status(500).json({
      error: "Failed to fetch video info",
      details:
        err.message.includes("Sign in")
          ? "Video requires login/cookies. Update cookies.txt."
          : err.message,
    });
  }
});

// ===== /api/download =====
app.post("/api/download", async (req, res) => {
  const { url, itag } = req.body;
  if (!url || !itag) return res.status(400).json({ error: "URL & itag required" });

  try {
    const proc = ytdlp.exec(url, {
      ...ytDlpOptions,
      format: itag,
      output: "-",
    });

    // Dynamically set content-type based on file extension
    const contentType = itag.includes('audio') ? 'audio/mp4' : 'video/mp4';
    res.setHeader("Content-Disposition", `attachment; filename="video_${itag}.mp4"`);
    res.setHeader("Content-Type", contentType);

    proc.stdout.pipe(res);

    proc.stderr.on("data", (d) => console.log("yt-dlp:", d.toString()));
    proc.on("error", (err) => {
      console.error("yt-dlp download error:", err);
      res.status(500).end("Download failed. Check cookies or video restrictions.");
    });
  } catch (err) {
    console.error("yt-dlp download catch error:", err.message);
    res.status(500).json({ error: "Download failed", details: err.message });
  }
});

// ===== Serve frontend =====
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ===== Start Server =====
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
