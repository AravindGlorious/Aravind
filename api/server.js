import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { exec } from "child_process";
import util from "util";

// Promisify exec for better async/await support
const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== POST /api/info ======
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ error: "No URL provided" });

  // yt-dlp command to fetch video info
  const cmd = `yt-dlp -j --no-warnings --no-check-certificates --prefer-free-formats "${url}"`;

  try {
    const { stdout, stderr } = await execPromise(cmd, { maxBuffer: 1024 * 1024 * 10 });
    
    if (stderr) {
      console.error("yt-dlp error:", stderr);
      return res.json({ error: "Failed to fetch video info." });
    }

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
    console.error("Error parsing or fetching video info:", e);
    res.json({ error: "Error parsing video info." });
  }
});

// ====== GET /api/download ======
app.get("/api/download", async (req, res) => {
  const { url, itag } = req.query;
  if (!url || !itag) return res.status(400).send("Missing parameters");

  // Set proper content disposition and filename dynamically based on URL
  res.setHeader("Content-Disposition", `attachment; filename="video_${itag}.mp4"`);

  const cmd = `yt-dlp -f ${itag} -o - "${url}"`;

  try {
    const child = exec(cmd, { maxBuffer: 1024 * 1024 * 100 });

    // Pipe the output (video data) to the response
    child.stdout.pipe(res);

    child.stderr.on("data", (data) => console.error("yt-dlp:", data));
    child.on("exit", (code) => {
      if (code === 0) {
        console.log("Download finished successfully.");
      } else {
        console.log(`Download process exited with code ${code}`);
      }
    });

  } catch (err) {
    console.error("Error during video download:", err);
    res.status(500).json({ error: "Download failed", details: err.message });
  }
});

// ====== Root Endpoint ======
app.get("/", (req, res) => {
  res.send("✅ YT Downloader API Running Successfully!");
});

// ====== Server Port ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

