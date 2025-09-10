// utils/convertCookies.js
import fs from "fs";
import path from "path";

/**
 * Converts raw JSON cookies (from browser export) to Netscape format for yt-dlp
 * @param {string} jsonPath - Path to JSON cookies file
 * @param {string} outputPath - Path to write Netscape format cookies
 */
export function convertCookies(jsonPath, outputPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON cookies file not found:", jsonPath);
    return;
  }

  let cookies;
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    cookies = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse JSON cookies:", err.message);
    return;
  }

  // Netscape format header
  const lines = [
    "# Netscape HTTP Cookie File",
    "# This file was generated automatically. DO NOT EDIT!",
    "",
  ];

  cookies.forEach((c) => {
    try {
      // yt-dlp expects: domain, includeSubdomains, path, secure, expiration, name, value
      const domain = c.domain || c.host || ".youtube.com";
      const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
      const cookiePath = c.path || "/";
      const secure = c.secure ? "TRUE" : "FALSE";
      const expiration = c.expirationDate
        ? Math.floor(c.expirationDate)
        : Math.floor(Date.now() / 1000) + 3600; // fallback: +1hr
      const name = c.name || c.key;
      const value = c.value || "";

      if (name && value) {
        lines.push([domain, flag, cookiePath, secure, expiration, name, value].join("\t"));
      }
    } catch (err) {
      console.warn("⚠️ Skipped invalid cookie:", err.message);
    }
  });

  fs.writeFileSync(outputPath, lines.join("\n"));
  console.log("✅ Converted cookies saved to", outputPath);
}

// -----------------------------
// Example usage (run manually)
// -----------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const jsonFile = path.join(process.cwd(), "cookies.json"); // your browser-exported JSON
  const outputFile = "/tmp/cookies.txt"; // yt-dlp compatible
  convertCookies(jsonFile, outputFile);
}
