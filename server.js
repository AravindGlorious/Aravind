import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import ytdlp from "yt-dlp-exec";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json()); // parse JSON request bodies

// -------------------- yt-dlp helper functions --------------------
async function getVideoInfo(url) {
  return await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    preferFreeFormats: true,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  });
}

async function streamDownload({ url, format = "best" }, res) {
  const child = ytdlp.exec(url, {
    format,
    output: "-",
  });

  child.stdout.pipe(res);
  child.stderr.on("data", (data) => {
    console.error("yt-dlp error:", data.toString());
  });

  child.on("close", (code) => {
    console.log(`yt-dlp exited with code ${code}`);
    res.end();
  });
}
// -----------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Info endpoint
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "Missing url" });

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error("INFO ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch info", detail: err.message });
  }
});

// Download endpoint
app.get("/api/download", async (req, res) => {
  try {
    const { url, format = "best" } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const safeName = "video";
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.mp4"`
    );

    await streamDownload({ url, format }, res);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Download failed", detail: err.message });
    } else {
      res.end();
    }
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback to index.html for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}`);
});
