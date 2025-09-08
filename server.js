import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { getVideoInfo, downloadVideo } from "./utils/ytdlp.js";

const app = express();
const PORT = process.env.PORT || 10000;

// __dirname fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API → Get video info
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing video URL" });

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch video info", details: err.message });
  }
});

// API → Download video
app.post("/api/download", async (req, res) => {
  try {
    const { url, format } = req.body;
    if (!url) return res.status(400).json({ error: "Missing video URL" });

    const filePath = await downloadVideo(url, format || "mp4");

    res.download(filePath, (err) => {
      if (err) console.error("Download error:", err);
    });
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    res.status(500).json({ error: "Failed to download video", details: err.message });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
