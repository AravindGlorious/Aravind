// ====== DOM Elements ======
const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const checkBtn = document.getElementById("checkBtn");
const loader = document.getElementById("loader");
const preview = document.getElementById("preview");
const thumb = document.getElementById("thumb");
const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const downloadOptions = document.getElementById("downloadOptions");

// ====== Reset Preview ======
function resetPreview() {
  preview.classList.add("hidden");
  thumb.src = "";
  titleEl.textContent = "";
  metaEl.textContent = "";
  downloadOptions.innerHTML = "";
}

// ====== Format file size helper ======
function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// ====== Fetch video info ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return alert("Please enter a valid URL");

  resetPreview();
  loader.classList.remove("hidden");

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    loader.classList.add("hidden");

    if (data.error) {
      alert(data.error);
      return;
    }

    // Show preview
    preview.classList.remove("hidden");
    thumb.src = data.thumbnail || "";
    titleEl.textContent = data.title || "Untitled Video";

    const mins = Math.floor((data.duration || 0) / 60);
    const secs = (data.duration || 0) % 60;
    const duration = data.duration
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : "Unknown";

    metaEl.textContent = `${data.uploader || "Unknown"} • ${duration}`;

    // Render format buttons
    downloadOptions.innerHTML = "";
    if (data.formats && data.formats.length > 0) {
      data.formats.forEach((f) => {
        const btn = document.createElement("button");
        btn.className =
          "bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg w-full text-left";
        btn.textContent = `${f.resolution} • ${f.ext} ${
          f.filesize ? `• ${formatSize(f.filesize)}` : ""
        }`;

        btn.addEventListener("click", () => {
          startDownload(url, f.itag);
        });

        downloadOptions.appendChild(btn);
      });
    } else {
      downloadOptions.innerHTML =
        "<p class='text-red-500 text-sm'>No formats available</p>";
    }
  } catch (err) {
    loader.classList.add("hidden");
    console.error("Error fetching info:", err);
    alert("Failed to fetch video info. Try again.");
  }
});

// ====== Start Download ======
function startDownload(url, itag) {
  const a = document.createElement("a");
  a.href = `/api/download?url=${encodeURIComponent(url)}&itag=${itag}`;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
