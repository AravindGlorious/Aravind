import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getVideoInfo, streamDownload } from "./utils/ytdlp-auto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// API: Fetch video info
// -----------------------------
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// API: Download video
// -----------------------------
app.post("/api/download", async (req, res) => {
  try {
    const { url, format } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
    await streamDownload({ url, format }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Start server
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
