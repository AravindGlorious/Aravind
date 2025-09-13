// ====== DOM Elements ======
const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const checkBtn = document.getElementById("checkBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loader = document.getElementById("loader");
const preview = document.getElementById("preview");
const thumb = document.getElementById("thumb");
const titleEl = document.getElementById("title");
const meta = document.getElementById("meta");
const errorEl = document.getElementById("error");
const qualitySelect = document.getElementById("quality");
const darkToggle = document.getElementById("darkToggle");
const langToggle = document.getElementById("langToggle");
const heroText = document.getElementById("heroText");
const subText = document.getElementById("subText");

let currentInfo = null;
let isTamil = false;

// ====== Dark Mode ======
const root = document.documentElement;
if (localStorage.getItem("theme") === "dark") {
  root.classList.add("dark");
  darkToggle.textContent = "☀️";
} else {
  darkToggle.textContent = "🌙";
}

darkToggle.addEventListener("click", () => {
  root.classList.toggle("dark");
  if (root.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    darkToggle.textContent = "☀️";
  } else {
    localStorage.setItem("theme", "light");
    darkToggle.textContent = "🌙";
  }
});

// ====== Language Toggle ======
langToggle.addEventListener("click", () => {
  isTamil = !isTamil;
  if (isTamil) {
    langToggle.textContent = "English";
    heroText.textContent = "இணைப்பு இங்கே ஒட்டு →";
    subText.textContent =
      "YouTube, Instagram, Facebook, TikTok, Twitter & பல. Original quality. 100% free.";
  } else {
    langToggle.textContent = "தமிழ்";
    heroText.textContent = "Paste link →";
    subText.textContent =
      "YouTube, Instagram, Facebook, TikTok, Twitter & more. Original quality. No signup. 100% free.";
  }
});

// ====== Current Year ======
document.getElementById("year").textContent = new Date().getFullYear();

// ====== Format Duration ======
function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ====== Fetch Video Info ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  loader.classList.remove("hidden");
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
    titleEl.textContent = data.title || "Untitled";
    meta.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${formatDuration(
      data.duration
    )}`;

    // Populate formats
    qualitySelect.innerHTML = "";
    if (data.formats && data.formats.length) {
      data.formats.forEach((f) => {
        const opt = document.createElement("option");
        const resText = f.resolution || (f.acodec && !f.vcodec ? "Audio" : "Unknown");
        opt.value = f.itag;
        opt.textContent = `${resText} (${f.ext})`;
        qualitySelect.appendChild(opt);
      });
    } else {
      qualitySelect.innerHTML = `<option value="best">Best</option>`;
    }

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

// ====== Download Video ======
downloadBtn.addEventListener("click", async () => {
  if (!currentInfo) return;

  const itag = qualitySelect.value;
  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentInfo.webpage_url, itag }),
    });

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const selectedFormat = currentInfo.formats.find((f) => f.itag == itag);
    const ext = selectedFormat?.ext || "mp4";
    const safeTitle = (currentInfo.title || "video")
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
    alert(err.message);
    console.error("Download error:", err);
  } finally {
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;
  }
});
