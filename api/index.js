import express from 'express';
import cors from 'cors';
import { getVideoInfo, streamDownload } from '../utils/ytdlp.js';

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/info', async (req, res) => {
  // same logic as before
});

app.get('/api/download', async (req, res) => {
  // same logic
});

export default app;
