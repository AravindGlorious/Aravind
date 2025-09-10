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
// Download Video/Audio
// -----------------------------
downloadBtn.addEventListener("click", async () => {
  if (!currentInfo) return;

  const url = currentInfo.webpage_url;
  const format = qualitySelect.value;

  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, format }),
    });

    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();
    const a = document.createElement("a");
    const safeTitle = (currentInfo.title || "video").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const ext = format === "audio" ? "mp3" : "mp4";

    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);

  } catch (err) {
    alert(err.message);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
