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

// ===== Check Button =====
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to fetch video info");

    videoInfo = data;

    // Preview
    thumb.src = data.thumbnail || "";
    titleEl.textContent = data.title || "Untitled";
    metaEl.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${
      data.duration ? `${Math.floor(data.duration / 60)}m ${data.duration % 60}s` : "N/A"
    }`;
    preview.classList.remove("hidden");

    // Populate quality dropdown
    qualitySelect.innerHTML = "";
    if (data.formats?.length) {
      data.formats.forEach((f) => {
        const opt = document.createElement("option");
        const resText = f.resolution || (f.acodec && !f.vcodec ? "Audio" : "Unknown");
        opt.value = f.itag;
        opt.textContent = `${resText} (${f.ext || "?"})`;
        qualitySelect.appendChild(opt);
      });
    } else {
      qualitySelect.innerHTML = `<option value="best">Best</option>`;
    }

    downloadBtn.disabled = false;
  } catch (err) {
    errorEl.textContent = err.message || "Something went wrong";
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
    itag = videoInfo.formats?.[0]?.itag || "best";
  }

  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoInfo.webpage_url, itag }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Download failed");
    }

    const blob = await res.blob();
    const selectedFormat = videoInfo.formats?.find((f) => f.itag == itag);
    const ext = selectedFormat?.acodec && !selectedFormat?.vcodec ? "mp3" : "mp4";
    const safeTitle = (videoInfo.title || "video")
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 50);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(err.message || "Error while downloading");
    console.error("Download error:", err);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
