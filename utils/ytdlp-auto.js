import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

// Default cookie file path
const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || "/tmp/cookies.txt";

// Handle cookie environment variable if provided
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES.trim());
    console.log("✅ Cookies written to", cookiesPath);
  } catch (err) {
    console.error("❌ Failed to write cookies:", err.message);
  }
} else {
  console.log("ℹ️ No cookies ENV variable provided. Public videos only.");
}

// 🔹 Get video info
export async function getVideoInfo(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      ffmpegLocation: ffmpegPath,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: fs.existsSync(cookiesPath) ? cookiesPath : undefined,
    };

    const json = await ytdlp(url, options);
    const primary = json?.entries?.length ? json.entries[0] : json;

    // Return useful info with defaults if necessary
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
    console.error("YT-DLP INFO ERROR:", err.stderr || err.message);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// 🔹 Stream download
export async function streamDownload({ url, format = "best" }, res) {
  try {
    const options = {
      format,
      ffmpegLocation: ffmpegPath,
      o: "-",
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: fs.existsSync(cookiesPath) ? cookiesPath : undefined,
    };

    const proc = ytdlp(url, options);
    proc.stdout.pipe(res);

    // Set content type dynamically based on format (example for mp4)
    proc.stdout.on("data", (data) => {
      const contentType = format.includes("mp4") ? "video/mp4" : "video/webm";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="video.${format}"`);
    });

    proc.stderr.on("data", (chunk) => {
      console.error("YT-DLP STDERR:", chunk.toString());
    });

    return new Promise((resolve, reject) => {
      proc.on("close", (code) => (code !== 0 ? reject(new Error(`yt-dlp exited with code ${code}`)) : resolve()));
      proc.on("error", reject);
    });
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    throw new Error(`Failed to download: ${err.message}`);
  }
}
