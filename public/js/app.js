// /js/app.js
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

    if (!res.ok) throw new Error("Failed to fetch video info");
    const data = await res.json();
    currentInfo = data;

    thumb.src = data.thumbnail || "";
    title.textContent = data.title || "Untitled";
    meta.textContent = `Uploader: ${data.uploader || "Unknown"} | Duration: ${data.duration ? data.duration + "s" : "N/A"}`;
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

downloadBtn.addEventListener("click", () => {
  if (!currentInfo) return;
  const url = currentInfo.webpage_url;
  const format = qualitySelect.value;
  const a = document.createElement("a");
  a.href = `/api/download?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;
  a.click();
});
