import { spawn } from 'child_process';

// Helper to run yt-dlp and capture JSON metadata
export function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const args = ['-J', '--no-warnings', '--no-call-home', url];
    const child = spawn('yt-dlp', args);

    let data = '';
    let errData = '';

    child.stdout.on('data', (chunk) => { data += chunk.toString(); });
    child.stderr.on('data', (chunk) => { errData += chunk.toString(); });

    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(errData || `yt-dlp exited with code ${code}`));
      try {
  const json = JSON.parse(data);
  const primary = json?.entries?.length ? json.entries[0] : json;
  resolve({
    title: primary?.title || 'Untitled',
    thumbnail: primary?.thumbnail || primary?.thumbnails?.[0]?.url || '',
    duration: primary?.duration || null,
    uploader: primary?.uploader || primary?.channel || '',
    webpage_url: primary?.webpage_url || url,
    extractor: primary?.extractor || json?.extractor,
    is_playlist: Boolean(json?.entries?.length),
  });
} catch (e) {
  console.error('yt-dlp output was not valid JSON:', data);
  reject(new Error('yt-dlp output is not valid JSON. Make sure the URL is correct and yt-dlp is installed.'));
}

    });

    child.on('error', reject);
  });
}

// Stream download directly to HTTP response
export function streamDownload({ url, format = 'best' }, res) {
  return new Promise((resolve, reject) => {
    // -f best chooses the best available combination. "-o -" writes to stdout
    const args = ['-f', format, '-o', '-', '--no-warnings', '--no-call-home', url];
    const child = spawn('yt-dlp', args);

    child.stdout.pipe(res);

    let errData = '';
    child.stderr.on('data', (chunk) => { errData += chunk.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(errData || `yt-dlp exited with code ${code}`));
      }
      resolve();
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
