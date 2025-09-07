// utils/ytdlp.js
import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

// ✅ Render & Vercel writable path
const cookiesPath = "/tmp/cookies.txt";

// ✅ Write cookies.txt from ENV variable if available
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
    console.log("✅ Cookies file written to", cookiesPath);
  } catch (err) {
    console.error("❌ Failed to write cookies file:", err.message);
  }
} else {
  console.warn("⚠️ YOUTUBE_COOKIES ENV variable not found!");
}

// -----------------------------
// Fetch video info as JSON
// -----------------------------
export async function getVideoInfo(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      ffmpegLocation: ffmpegPath,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    };

    // ✅ Attach cookies if exist
    if (fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
      console.log("✅ Using cookies for yt-dlp:", cookiesPath);
    } else {
      console.warn("⚠️ Cookies file not found, fetching may fail for restricted videos");
    }

    const json = await ytdlp(url, options);
    const primary = json?.entries?.length ? json.entries[0] : json;

    return {
      title: primary?.title || "Untitled",
      thumbnail: primary?.thumbnail || primary?.thumbnails?.[0]?.url || "",
      duration: primary?.duration || null,
      uploader: primary?.uploader || primary?.channel || "",
      webpage_url: primary?.webpage_url || url,
      extractor: primary?.extractor || json?.extractor,
      is_playlist: Boolean(json?.entries?.length),
    };
  } catch (err) {
    console.error("YT-DLP INFO ERROR:", err);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// -----------------------------
// Stream download directly to HTTP response
// -----------------------------
export async function streamDownload({ url, format = "best" }, res) {
  try {
    const options = {
      format,
      ffmpegLocation: ffmpegPath,
      o: "-", // output to stdout
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    };

    // ✅ Attach cookies if exist
    if (fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
      console.log("✅ Using cookies for download:", cookiesPath);
    } else {
      console.warn("⚠️ Cookies file not found, download may fail for restricted videos");
    }

    const proc = ytdlp(url, options);
    proc.stdout.pipe(res);

    proc.stderr.on("data", (chunk) => {
      console.error("YT-DLP STDERR:", chunk.toString());
    });

    return new Promise((resolve, reject) => {
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}`));
        } else {
          resolve();
        }
      });
      proc.on("error", reject);
    });
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err);
    throw new Error(`Failed to download: ${err.message}`);
  }
}
