import express from "express";
import cors from "cors";
import { getInfo, downloadVideo } from "../utils/ytdlp.js"; // adjust if filename differs

const app = express();
app.use(express.json());
app.use(cors());

// 🔹 POST /api/info  → get video details
app.post("/api/info", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing url in request body" });
  }

  try {
    const info = await getInfo(url);
    return res.json(info);
  } catch (err) {
    console.error("Error in /api/info:", err.message);
    return res.status(500).json({ error: "Failed to fetch video info" });
  }
});

// 🔹 GET /api/download?url=...&itag=...
app.get("/api/download", async (req, res) => {
  const { url, itag } = req.query;

  if (!url || !itag) {
    return res.status(400).json({ error: "Missing url or itag in query" });
  }

  try {
    // Instead of saving to disk, stream to client
    res.setHeader("Content-Disposition", `attachment; filename="video_${itag}.mp4"`);
    res.setHeader("Content-Type", "video/mp4");

    // pipe the yt-dlp process directly into the response
    const { spawn } = await import("child_process");
    const ytdlp = spawn("yt-dlp", ["-f", itag, "-o", "-", url]);

    ytdlp.stdout.pipe(res);
    ytdlp.stderr.on("data", (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

    ytdlp.on("close", (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
    });
  } catch (err) {
    console.error("Error in /api/download:", err.message);
    return res.status(500).json({ error: "Failed to download video" });
  }
});

export default app;
