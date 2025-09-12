// -----------------------------
// DOM Elements
// -----------------------------
const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const checkBtn = document.getElementById("checkBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loader = document.getElementById("loader");
const preview = document.getElementById("preview");
const thumb = document.getElementById("thumb");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const errorEl = document.getElementById("error");
const qualitySelect = document.getElementById("quality");

let currentInfo = null;

// -----------------------------
// Dark Mode Toggle
// -----------------------------
document.getElementById("darkToggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// -----------------------------
// Language Toggle
// -----------------------------
const langToggle = document.getElementById("langToggle");
const heroText = document.getElementById("heroText");
const subText = document.getElementById("subText");
let isTamil = false;

langToggle.addEventListener("click", () => {
  isTamil = !isTamil;
  if (isTamil) {
    langToggle.textContent = "English";
    heroText.textContent = "லிங்க் ஒட்டு →";
    subText.textContent =
      "YouTube, Instagram, Facebook, TikTok & மேலும். அசல் தரம். பதிவு தேவையில்லை. 100% இலவசம்.";
  } else {
    langToggle.textContent = "தமிழ்";
    heroText.textContent = "Paste link →";
    subText.textContent =
      "YouTube, Instagram, Facebook, TikTok & more. Original quality. No signup. 100% free for a limited time.";
  }
});

// -----------------------------
// Footer Year
// -----------------------------
document.getElementById("year").textContent = new Date().getFullYear();

// -----------------------------
// Format Duration
// -----------------------------
function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// -----------------------------
// Check Video Info
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  loader.classList.remove("hidden");
  preview.classList.add("hidden");
  errorEl.classList.add("hidden");
  downloadBtn.disabled = true;

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to fetch video info");
    }

    const data = await res.json();
    currentInfo = data;

    // Update Preview
    thumb.src = data.thumbnail || "";
    title.textContent = data.title || "Untitled";
    meta.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${formatDuration(data.duration)}`;

    preview.classList.remove("hidden");
    downloadBtn.disabled = false;

    // Populate Quality Options dynamically if available
    if (data.formats) {
      qualitySelect.innerHTML = "";
      // Filter unique resolutions
      const resolutions = new Set();
      data.formats.forEach(f => {
        if (f.height) resolutions.add(`${f.height}p`);
      });
      Array.from(resolutions)
        .sort((a, b) => parseInt(b) - parseInt(a))
        .forEach(res => {
          const opt = document.createElement("option");
          opt.value = res;
          opt.textContent = res;
          qualitySelect.appendChild(opt);
        });
      // Always add Best & Audio options
      qualitySelect.insertAdjacentHTML("afterbegin", `<option value="best">Best</option>`);
      qualitySelect.insertAdjacentHTML("beforeend", `<option value="audio">Audio Only (mp3)</option>`);
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || "Something went wrong!";
    errorEl.classList.remove("hidden");
  } finally {
    loader.classList.add("hidden");
  }
});

// -----------------------------
// Download Video
// -----------------------------
downloadBtn.addEventListener("click", async () => {
  if (!currentInfo) return;

  const url = currentInfo.webpage_url || urlInput.value.trim();
  const format = qualitySelect.value;

  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, format }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Download failed");
    }

    // Convert response to blob and download
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentInfo.title || "video"}${format === "audio" ? ".mp3" : ".mp4"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(err.message);
    console.error("Download error:", err);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
