const form = document.getElementById("dl-form");
const urlInput = document.getElementById("url");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return alert("Please enter a video URL");

  preview.innerHTML = "";
  loader.style.display = "block";

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    loader.style.display = "none";

    if (data.error) {
      preview.innerHTML = `<p style="color:red">${data.error}</p>`;
      return;
    }

    // Format duration
    const formatDuration = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
    };

    // Create preview card
    let html = `
      <div class="video-card">
        <img src="${data.thumbnail}" alt="thumbnail" class="thumb"/>
        <h3>${data.title}</h3>
        <p>Uploader: ${data.uploader}</p>
        <p>Duration: ${formatDuration(data.duration)}</p>
      </div>
    `;

    // Add formats table
    html += `<table class="formats-table">
      <thead>
        <tr>
          <th>Resolution</th>
          <th>Type</th>
          <th>Size</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
    `;

    data.formats.forEach((f) => {
      const sizeMB = f.filesize ? (f.filesize / (1024 * 1024)).toFixed(2) + " MB" : "-";
      const type = f.vcodec !== "none" ? "Video" : "Audio";
      html += `
        <tr>
          <td>${f.resolution}</td>
          <td>${type}</td>
          <td>${sizeMB}</td>
          <td>
            <button class="dl-btn" onclick="downloadVideo('${url}','${f.itag}')">
              Download
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    preview.innerHTML = html;
  } catch (err) {
    loader.style.display = "none";
    preview.innerHTML = `<p style="color:red">Error fetching video info.</p>`;
    console.error(err);
  }
});

// Download function
function downloadVideo(url, itag) {
  const a = document.createElement("a");
  a.href = `/api/download`;
  a.method = "POST";

  // Create a form dynamically to send POST request
  const form = document.createElement("form");
  form.action = "/api/download";
  form.method = "POST";

  const inputURL = document.createElement("input");
  inputURL.type = "hidden";
  inputURL.name = "url";
  inputURL.value = url;

  const inputItag = document.createElement("input");
  inputItag.type = "hidden";
  inputItag.name = "itag";
  inputItag.value = itag;

  form.appendChild(inputURL);
  form.appendChild(inputItag);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
