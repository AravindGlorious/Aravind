// ====== DOM Elements ======
const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const qualitySelect = document.getElementById("quality");
const checkBtn = document.getElementById("checkBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loader = document.getElementById("loader");
const preview = document.getElementById("preview");
const thumb = document.getElementById("thumb");
const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const errorEl = document.getElementById("error");

let videoInfo = null;

// Utility: format seconds to HH:MM:SS
function formatDuration(sec) {
  if (!sec && sec !== 0) return "N/A";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [
    h > 0 ? String(h).padStart(2, "0") : null,
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0")
  ].filter(x => x !== null).join(":");
}

// ===== Check Button =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) {
    errorEl.textContent = "Please enter URL";
    errorEl.classList.remove("hidden");
    return;
  }

  // Reset UI
  loader.classList.remove("hidden");
  preview.classList.add("hidden");
  errorEl.classList.add("hidden");
  downloadBtn.disabled = true;
  qualitySelect.innerHTML = "";

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch video info");

    videoInfo = data;

    // Populate preview
    thumb.src = data.thumbnail || "";
    titleEl.textContent = data.title || "Untitled";
    metaEl.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${formatDuration(data.duration)}`;

    // Populate quality / format dropdown
    if (data.formats && data.formats.length > 0) {
      data.formats.forEach((f) => {
        // compute size text
        const sizeBytes = f.filesize || f.filesize_approx || null;
        const sizeText = sizeBytes
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : "N/A";
        const resText = f.resolution || (f.acodec && !f.vcodec ? "Audio" : f.format_note || "Unknown");
        const option = document.createElement("option");
        option.value = f.itag;
        option.textContent = `${resText} | ${f.ext || ""} | ${sizeText}`;
        qualitySelect.appendChild(option);
      });
    } else {
      // fallback
      const option = document.createElement("option");
      option.value = "best";
      option.textContent = "Best Available";
      qualitySelect.appendChild(option);
    }

    preview.classList.remove("hidden");
    downloadBtn.disabled = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    loader.classList.add("hidden");
  }
});

// ===== Download Button =====
downloadBtn.addEventListener("click", async () => {
  if (!videoInfo) return;

  let itag = qualitySelect.value;
  if (itag === "best") {
    // pick best available (e.g. first from formats sorted by quality)
    itag = videoInfo.formats?.[0]?.itag || itag;
  }

  // Update UI
  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoInfo.webpage_url, itag }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Download failed");
    }

    const blob = await res.blob();

    // Determine extension
    const fmt = videoInfo.formats?.find((f) => f.itag == itag);
    let ext = "mp4";
    if (fmt) {
      // If audio only format (no video), maybe ext is audio codec or simply pick f.ext
      if (fmt.vcodec === "none") {
        ext = fmt.ext || "mp3";
      } else {
        ext = fmt.ext || "mp4";
      }
    }

    const safeTitle = (videoInfo.title || "video")
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 50);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  } catch (err) {
    alert(err.message || "Error while downloading");
    console.error("Download error:", err);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
