const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const youtubedl = require("yt-dlp-exec");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ============ Preview API ============
app.post("/api/preview", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, error: "No URL" });

    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
    });

    const files = (info.formats || [])
      .filter(f => f.url && f.ext === "mp4")
      .map(f => ({
        label: `${f.height || "?"}p`,
        url: f.url,
        quality: f.height ? `${f.height}p` : "unknown",
        type: `video/${f.ext}`
      }));

    res.json({
      success: true,
      title: info.title,
      author: info.uploader || "",
      thumbnail: info.thumbnail || "",
      files
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ============ Download API ============
app.post("/api/download", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, error: "No URL" });

    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
    });

    const best = info.formats.find(f => f.url && f.ext === "mp4");
    res.json({ success: true, downloadUrl: best?.url || info.url });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ============ Bulk API (simple demo) ============
app.post("/api/bulk", async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.json({ success: false });
  res.json({ jobId: Date.now(), items: urls.map(u => ({ url: u, status: "Queued" })) });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Backend running on " + PORT));
