import express from "express";
import fs from "fs";
import path from "path";
import { getInfo, downloadVideo } from "./utils/ytdlp.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Video info
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const info = await getInfo(url);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download
app.post("/api/download", async (req, res) => {
  try {
    const { url, itag } = req.body;
    if (!url || !itag) return res.status(400).json({ error: "URL and itag required" });

    const file = `video_${Date.now()}.mp4`;
    const outputPath = path.join("/tmp", file);

    await downloadVideo(url, itag, outputPath);

    res.download(outputPath, file, err => {
      if (err) console.error(err);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
