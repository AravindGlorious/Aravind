// utils/ytdlp.js
import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

const cookiesPath = "/tmp/cookies.txt";

// ✅ When running on Render / Vercel, write cookies.txt from ENV variable
if (process.env.YOUTUBE_COOKIES) {
  fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
}

// Fetch video info as JSON
export async function getVideoInfo(url) {
  try {
    const json = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      ffmpegLocation: ffmpegPath,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: cookiesPath, // ✅ use /tmp/cookies.txt
    });

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
    throw new Error(`yt-dlp info failed: ${err.message}`);
  }
}

// Stream download directly to HTTP response
export async function streamDownload({ url, format = "best" }, res) {
  try {
    const proc = ytdlp(url, {
      format,
      ffmpegLocation: ffmpegPath,
      o: "-", // output to stdout
      noWarnings: true,
      noCallHome: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      cookies: cookiesPath, // ✅ use /tmp/cookies.txt
    });

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
    throw new Error(`yt-dlp download failed: ${err.message}`);
  }
}
