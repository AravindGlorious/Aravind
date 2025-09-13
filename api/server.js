// server.js
import express from "express";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
app.use(cors());

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// YT-DLP binary
const ytdlpBin = path.join(__dirname, "node_modules/yt-dlp-exec/bin/yt-dlp");

// Cookies.txt file path
const cookiesFile = path.join(__dirname, "cookies.txt");

// API endpoint
app.get("/api/info", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // yt-dlp command with cookies
  const command = `${ytdlpBin} ${url} --dump-single-json --no-warnings --no-call-home --prefer-free-formats --add-header "referer:youtube.com" --add-header "user-agent:googlebot" --cookies ${cookiesFile}`;

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", stderr || error.message);
      return res.status(500).json({
        error: "Failed to fetch video info. It might be restricted or require cookies.",
      });
    }

    try {
      const info = JSON.parse(stdout);
      res.json(info);
    } catch (err) {
      console.error("JSON parse error:", err.message);
      res.status(500).json({ error: "Failed to parse video info." });
    }
  });
});

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
