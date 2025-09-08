// utils/convertCookies.js
import fs from "fs";
import path from "path";

/**
 * Converts raw JSON cookies to Netscape format for yt-dlp
 * @param {string} jsonPath - Path to JSON cookies file
 * @param {string} outputPath - Path to write Netscape format cookies
 */
export function convertCookies(jsonPath, outputPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON cookies file not found:", jsonPath);
    return;
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  let cookies;

  try {
    cookies = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse JSON cookies:", err.message);
    return;
  }

  // Start Netscape format file
  const lines = ["# Netscape HTTP Cookie File"];

  cookies.forEach((c) => {
    // yt-dlp expects these fields: domain, flag, path, secure, expiration, name, value
    const domain = c.domain || c.host || ".youtube.com";
    const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
    const cookiePath = c.path || "/";
    const secure = c.secure ? "TRUE" : "FALSE";
    const expiration = c.expirationDate
      ? Math.floor(c.expirationDate)
      : Math.floor(Date.now() / 1000) + 3600; // 1 hour default
    const name = c.name || c.key;
    const value = c.value;

    if (name && value) {
      lines.push([domain, flag, cookiePath, secure, expiration, name, value].join("\t"));
    }
  });

  fs.writeFileSync(outputPath, lines.join("\n"));
  console.log("✅ Converted cookies saved to", outputPath);
}

// -----------------------------
// Example usage
// -----------------------------
const jsonFile = path.join(process.cwd(), "cookies.json"); // your raw JSON cookies
const outputFile = "/tmp/cookies.txt"; // yt-dlp uses this

convertCookies(jsonFile, outputFile);
