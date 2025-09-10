// utils/ytdlp.js
import youtubedl from "yt-dlp-exec";
import fs from "fs";

export async function getVideoInfo(url) {
  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      cookies: "/tmp/cookies.txt",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    });

    return output;
  } catch (err) {
    console.error("yt-dlp error:", err);
    throw new Error("Failed to fetch video info");
  }
}

export async function downloadVideo(url, outputPath) {
  try {
    await youtubedl(url, {
      output: outputPath,
      cookies: "/tmp/cookies.txt",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    });
    return outputPath;
  } catch (err) {
    console.error("yt-dlp download error:", err);
    throw new Error("Failed to download video");
  }
}
