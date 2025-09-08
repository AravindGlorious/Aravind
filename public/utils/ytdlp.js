import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";

// Optional cookies setup
const cookiesPath = "/tmp/cookies.txt";
if (process.env.YOUTUBE_COOKIES) {
  fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
}

// Fetch video info
export async function getVideoInfo(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    };
    if (fs.existsSync(cookiesPath)) options.cookies = cookiesPath;

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
    console.error("YT-DLP INFO ERROR:", err.message);
    throw new Error(`Failed to fetch info: ${err.message}`);
  }
}

// Download video to temp folder
export async function downloadVideo(url, format = "best") {
  return new Promise((resolve, reject) => {
    const tempPath = path.join("/tmp", "video.mp4");
    const options = {
      format,
      o: tempPath,
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    };
    if (fs.existsSync(cookiesPath)) options.cookies = cookiesPath;

    const proc = ytdlp(url, options);

    proc.stderr.on("data", (chunk) => {
      console.error("YT-DLP STDERR:", chunk.toString());
    });

    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`yt-dlp exited with code ${code}`));
      else resolve(tempPath);
    });

    proc.on("error", reject);
  });
}
