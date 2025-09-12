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

// Dark mode
document.getElementById("darkToggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Check video info
form.addEventListener("submit", async e => {
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
    meta.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${data.duration || "N/A"}s`;

    // Populate formats
    qualitySelect.innerHTML = "";
    data.formats.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.itag;
      opt.textContent = `${f.resolution} (${f.ext})`;
      qualitySelect.appendChild(opt);
    });

    preview.classList.remove("hidden");
    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    loader.classList.add("hidden");
  }
});

// Download video
downloadBtn.addEventListener("click", async () => {
  if (!currentInfo) return;
  const itag = qualitySelect.value;
  const url = currentInfo.webpage_url;

  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, itag }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Download failed");
    }

    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentInfo.title || "video"}.${itag.includes("audio") ? "mp3" : "mp4"}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(err.message);
    console.error("Download error:", err);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
