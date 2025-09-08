const $ = (sel) => document.querySelector(sel);
const form = $('#dl-form');
const urlInput = $('#url');
const checkBtn = $('#checkBtn');
const downloadBtn = $('#downloadBtn');
const preview = $('#preview');
const thumb = $('#thumb');
const title = $('#title');
const meta = $('#meta');
const errorEl = $('#error');
const loader = $('#loader');
const qualitySelect = $('#quality');

// Year in footer
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');
  preview.classList.add('hidden');
  downloadBtn.disabled = true;

  const url = urlInput.value.trim();
  if (!url) return;

  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking…';
  loader.classList.remove('hidden'); // show loader

  try {
    const r = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const info = await r.json();
    if (!r.ok) throw new Error(info?.error || 'Failed');

    // Populate preview
    preview.classList.remove('hidden');
    thumb.src = info.thumbnail || '';
    title.textContent = info.title || 'Untitled';
    meta.textContent = [
      info.uploader,
      info.duration ? `${Math.round(info.duration / 60)} min` : ''
    ].filter(Boolean).join(' • ');

    // Enable download
    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const selectedQuality = qualitySelect.value || 'best';
      const dUrl = `/api/download?url=${encodeURIComponent(url)}&format=${selectedQuality}`;
      window.location.href = dUrl;
    };
  } catch (err) {
    errorEl.textContent = err.message || 'Error fetching info';
    errorEl.classList.remove('hidden');
    preview.classList.add('hidden');
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check';
    loader.classList.add('hidden'); // hide loader
  }
});
