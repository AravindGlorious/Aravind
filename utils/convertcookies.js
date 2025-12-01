// utils/convertCookies.js
import fs from "fs";
import path from "path";

/**
 * Converts raw JSON cookies (from browser export) to Netscape format for yt-dlp
 * @param {string} jsonPath - Path to JSON cookies file
 * @param {string} outputPath - Path to write Netscape format cookies
 */
export function convertCookies(jsonPath, outputPath) {
  // Check if the JSON file exists
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON cookies file not found:", jsonPath);
    return;
  }

  let cookies;
  try {
    // Read and parse the JSON cookies file
    const raw = fs.readFileSync(jsonPath, "utf-8");
    cookies = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse JSON cookies:", err.message);
    return;
  }

  // Start Netscape format header
  const lines = [
    "# Netscape HTTP Cookie File",
    "# This file was generated automatically. DO NOT EDIT!",
    "",
  ];

  // Iterate through each cookie and convert to Netscape format
  cookies.forEach((c, index) => {
    try {
      // yt-dlp expects: domain, includeSubdomains, path, secure, expiration, name, value
      const domain = c.domain || c.host || ".youtube.com"; // Default to YouTube if domain is missing
      const flag = domain.startsWith(".") ? "TRUE" : "FALSE"; // Include subdomains if domain starts with a dot
      const cookiePath = c.path || "/"; // Default cookie path is "/"
      const secure = c.secure ? "TRUE" : "FALSE"; // Secure flag
      const expiration = c.expirationDate
        ? Math.floor(c.expirationDate / 1000) // Convert milliseconds to seconds
        : Math.floor(Date.now() / 1000) + 3600; // Fallback expiration (+1hr)
      const name = c.name || c.key; // Cookie name (use key if name is missing)
      const value = c.value || ""; // Cookie value (fallback to empty string)

      // Skip invalid cookies or those missing required fields
      if (name && value) {
        lines.push([domain, flag, cookiePath, secure, expiration, name, value].join("\t"));
      } else {
        console.warn(`⚠️ Skipped invalid cookie at index ${index}: Missing name or value.`);
      }
    } catch (err) {
      console.warn("⚠️ Skipped invalid cookie:", err.message);
    }
  });

  // If there are valid cookies, write them to the output file
  if (lines.length > 3) {
    fs.writeFileSync(outputPath, lines.join("\n"));
    console.log("✅ Converted cookies saved to", outputPath);
  } else {
    console.warn("⚠️ No valid cookies to save.");
  }
}

// -----------------------------
// Example usage (run manually)
// -----------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
  // Get the input JSON file and output file paths from command-line arguments
  const jsonFile = process.argv[2] || path.join(process.cwd(), "cookies.json"); // Default to cookies.json
  const outputFile = process.argv[3] || path.join(process.cwd(), "cookies.txt"); // Default to cookies.txt
  convertCookies(jsonFile, outputFile);
}
