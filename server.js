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

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json()); // for parsing JSON request bodies

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Info endpoint
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error('INFO ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch info', detail: err.message });
  }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'best' } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const safeName = 'video';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp4"`);

    await streamDownload({ url, format }, res);
  } catch (err) {
    console.error('DOWNLOAD ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed', detail: err.message });
    } else {
      res.end();
    }
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}`);
});

