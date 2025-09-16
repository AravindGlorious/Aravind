// ====== DOM Elements ======
const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");

function formatDuration(seconds) {
  if (!seconds) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].filter((v, i) => v > 0 || i > 0).map(v => String(v).padStart(2, "0")).join(":");
}

function formatFileSize(bytes) {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// ====== Handle Form Submit ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return alert("Please enter a valid video URL!");

  loader.style.display = "block";
  preview.innerHTML = "";

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    loader.style.display = "none";

    if (data.error) {
      preview.innerHTML = `<p class="text-red-500">${data.error}</p>`;
      return;
    }

    // ====== Build Preview Card ======
    preview.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4">
        <img src="${data.thumbnail}" alt="Thumbnail" class="rounded-lg mb-3 w-full max-h-64 object-cover"/>
        <h2 class="text-lg font-bold mb-2">${data.title}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">Uploader: ${data.uploader || "Unknown"}</p>
        <p class="text-sm text-gray-600 dark:text-gray-300">Duration: ${formatDuration(data.duration)}</p>
        <div class="mt-4">
          <h3 class="font-semibold mb-2">Available Formats:</h3>
          <div class="grid grid-cols-2 gap-2" id="formats"></div>
        </div>
      </div>
    `;

    const formatsDiv = document.getElementById("formats");
    data.formats.forEach((f) => {
      const btn = document.createElement("button");
      btn.className =
        "px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm";
      const sizeText = f.filesize ? formatFileSize(f.filesize) : "Unknown size";
      btn.innerText = `${f.resolution} • ${f.ext} • ${sizeText}`;
      btn.onclick = () => downloadVideo(data.webpage_url, f.itag, f.ext);
      formatsDiv.appendChild(btn);
    });
  } catch (err) {
    loader.style.display = "none";
    console.error("Error:", err);
    preview.innerHTML = `<p class="text-red-500">Failed to fetch video info. Try again.</p>`;
  }
});

// ====== Download Video ======
async function downloadVideo(url, itag, ext = "mp4") {
  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, itag }),
    });

    if (!res.ok) throw new Error("Download failed");

    // Convert response into Blob and download
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `video_${itag}.${ext}`;
    a.click();
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed. Please try another format.");
  }
}
