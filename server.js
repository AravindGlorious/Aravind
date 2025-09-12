import express from "express";
import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// 🔹 API: Get video info
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: [
        "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        "referer: https://www.youtube.com/"
      ],
      cookies: fs.existsSync("cookies.txt") ? "cookies.txt" : undefined
    });

    let thumb =
      info.thumbnail ||
      (info.thumbnails && info.thumbnails[0]?.url) ||
      null;

    return res.json({
      title: info.title || "Untitled Video",
      uploader: info.uploader || "Unknown",
      duration: info.duration || null,
      webpage_url: info.webpage_url || url,
      thumbnail: thumb,
      formats: info.formats?.map(f => ({
        itag: f.format_id,
        resolution: f.height ? `${f.height}p` : f.format_note || "audio",
        ext: f.ext,
        url: f.url
      })) || []
    });
  } catch (err) {
    console.error("yt-dlp error:", err);
    return res.status(500).json({ error: "Failed to fetch video info" });
  }
});

// 🔹 API: Download video
app.post("/api/download", async (req, res) => {
  try {
    const { url, itag } = req.body;
    if (!url || !itag) return res.status(400).json({ error: "URL and itag required" });

    const file = `video_${Date.now()}.mp4`;
    const outputPath = path.join("/tmp", file);

    await ytdlp(url, {
      format: itag,
      output: outputPath,
      addHeader: [
        "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        "referer: https://www.youtube.com/"
      ],
      cookies: fs.existsSync("cookies.txt") ? "cookies.txt" : undefined
    });

    res.download(outputPath, file, err => {
      if (err) console.error("Download error:", err);
      fs.unlinkSync(outputPath); // cleanup temp file
    });
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Failed to download video" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
