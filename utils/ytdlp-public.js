import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

// -----------------------------
// Path for cookies
// -----------------------------
const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || "/tmp/cookies.txt";

// If ENV variable with Netscape cookies content is provided, write it
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES.trim());
    console.log("✅ Cookies file written to", cookiesPath);

    const content = fs.readFileSync(cookiesPath, "utf-8");
    if (!content.includes("# Netscape HTTP Cookie File")) {
      console.warn(
        "⚠️ Cookies file may not be in proper Netscape format. Restricted video fetch may fail!"
      );
    }
  } catch (err) {
    console.error("❌ Failed to write cookies file:", err.message);
  }
} else {
  console.log("ℹ️ No cookies ENV variable provided. Public videos only.");
}

// -----------------------------
// Fetch video info
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

    // Attach cookies if available
    if (fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
      console.log("✅ Using cookies for info fetch:", cookiesPath);
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
    console.error("YT-DLP INFO ERROR:", err.stderr || err.message);
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

    if (fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
      console.log("✅ Using cookies for download:", cookiesPath);
    }

    const proc = ytdlp(url, options);
    proc.stdout.pipe(res);

    proc.stderr.on("data", (chunk) => {
      console.error("YT-DLP STDERR:", chunk.toString());
    });

    return new Promise((resolve, reject) => {
      proc.on("close", (code) => {
        if (code !== 0) reject(new Error(`yt-dlp exited with code ${code}`));
        else resolve();
      });
      proc.on("error", reject);
    });
  } catch (err) {
    console.error("YT-DLP DOWNLOAD ERROR:", err.message);
    throw new Error(`Failed to download: ${err.message}`);
  }
}
