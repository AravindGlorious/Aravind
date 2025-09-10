// /public/js/app.js
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
    subText.textContent = "YouTube, Instagram, Facebook, TikTok & மேலும். அசல் தரம். பதிவு தேவையில்லை. 100% இலவசம்.";
  } else {
    langToggle.textContent = "தமிழ்";
    heroText.textContent = "Paste link →";
    subText.textContent = "YouTube, Instagram, Facebook, TikTok & more. Original quality. No signup. 100% free for a limited time.";
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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch video info");

    currentInfo = data;

    thumb.src = data.thumbnail || "";
    title.textContent = data.title || "Untitled";
    meta.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${formatDuration(data.duration)}`;

    preview.classList.remove("hidden");
    downloadBtn.disabled = false;
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
downloadBtn.addEventListener("click", () => {
  if (!currentInfo) return;

  const url = currentInfo.webpage_url;
  const format = qualitySelect.value;
  const fileName = `${currentInfo.title || "video"}${format === "audio" ? ".mp3" : ".mp4"}`;

  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  // Create a form to trigger browser download via POST
  const formEl = document.createElement("form");
  formEl.method = "POST";
  formEl.action = "/api/download";
  formEl.target = "_blank";

  const urlInputEl = document.createElement("input");
  urlInputEl.type = "hidden";
  urlInputEl.name = "url";
  urlInputEl.value = url;

  const formatInputEl = document.createElement("input");
  formatInputEl.type = "hidden";
  formatInputEl.name = "format";
  formatInputEl.value = format;

  formEl.appendChild(urlInputEl);
  formEl.appendChild(formatInputEl);
  document.body.appendChild(formEl);
  formEl.submit();
  document.body.removeChild(formEl);

  downloadBtn.textContent = "Download";
  downloadBtn.disabled = false;
});
