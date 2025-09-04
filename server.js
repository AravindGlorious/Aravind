import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getVideoInfo, streamDownload } from './utils/ytdlp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic security & performance middlewares
app.use(helmet({
  contentSecurityPolicy: false // keep CSP simple for CDN Tailwind; tighten later
}));
app.use(compression());
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Static assets
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Info endpoint — returns metadata for any supported URL
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url' });
    }
    const info = await getVideoInfo(url);
    return res.json(info);
  } catch (err) {
    console.error('INFO ERROR:', err);
    return res.status(500).json({ error: 'Failed to fetch info', detail: String(err?.message || err) });
  }
});

// Download endpoint — streams original/best quality to client
// Example: GET /api/download?url=...&format=best
app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'best' } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    // Set a generic filename; getVideoInfo for title if you want exact
    const safeName = 'video';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp4"`);

    await streamDownload({ url, format }, res);
  } catch (err) {
    console.error('DOWNLOAD ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed', detail: String(err?.message || err) });
    } else {
      res.end();
    }
  }
});

// Fallback to index.html for root only (no SPA routing here)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✔ Server running on http://localhost:${PORT}`);
});
