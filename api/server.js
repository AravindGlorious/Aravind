import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== POST /api/info ======
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ error: "No URL provided" });

  const cmd = `yt-dlp -j --no-warnings --no-call-home --no-check-certificates --prefer-free-formats "${url}"`;
  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    if (err) {
      console.error("yt-dlp error:", stderr || err);
      return res.json({ error: "Failed to fetch video info." });
    }

    try {
      const info = JSON.parse(stdout);
      const formats = (info.formats || [])
        .filter((f) => f.height && f.ext)
        .map((f) => ({
          itag: f.format_id,
          ext: f.ext,
          resolution: `${f.height}p`,
          filesize: f.filesize || null,
        }));

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        duration: info.duration,
        formats,
      });
    } catch (e) {
      console.error("Parse error:", e);
      res.json({ error: "Error parsing video info." });
    }
  });
});

// ====== GET /api/download ======
app.get("/api/download", async (req, res) => {
  const { url, itag } = req.query;
  if (!url || !itag) return res.status(400).send("Missing parameters");

  res.setHeader("Content-Disposition", "attachment");
  const cmd = `yt-dlp -f ${itag} -o - "${url}"`;

  const child = exec(cmd, { maxBuffer: 1024 * 1024 * 100 });

  child.stdout.pipe(res);
  child.stderr.on("data", (data) => console.error("yt-dlp:", data));
  child.on("exit", (code) => console.log("Download finished:", code));
});

// ====== Root Endpoint ======
app.get("/", (req, res) => {
  res.send("✅ YT Downloader API Running Successfully!");
});

// ====== Server Port ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
