const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const RendererEngine = require('./renderer-engine');
const historyStore = require('./history-store');
const { probeMedia } = require('./verify-mp4');
const { compileMarkdownToHtml } = require('./markdown-compiler');

// Global crash resilience
process.on('uncaughtException', err => {
  console.error('[Server Uncaught Exception]:', err.message);
});
process.on('unhandledRejection', reason => {
  console.error('[Server Unhandled Rejection]:', reason);
});

const app = express();
const PORT = process.env.PORT || (process.env.SPACE_ID ? 7860 : 3333);

const uploadDir = path.resolve(__dirname, '../uploads');
const previewsDir = path.resolve(__dirname, '../uploads/previews');
const outputDir = path.resolve(__dirname, '../output');
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Synchronize disk files with history store
historyStore.syncFromDisk();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Full Cross-Origin Resource Sharing (CORS) & Cache Controls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Static mounts & Direct MP4 attachment download handler
app.use(express.static(publicDir));

app.get(['/output/:filename', '/download/:filename'], (req, res, next) => {
  const filePath = path.join(outputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    const isDownload = req.path.startsWith('/download') || req.query.download === '1';
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
    }
    return res.sendFile(filePath);
  }
  next();
});

app.use('/output', express.static(outputDir));
app.use('/uploads', express.static(uploadDir));
app.use('/previews', express.static(previewsDir));
app.use('/fixtures', express.static(path.resolve(__dirname, '../fixtures')));

// ==========================================
// PREVIEW APIS (HTML & MARKDOWN)
// ==========================================

// Compile Markdown to Live Preview HTML
app.post('/api/preview-markdown', (req, res) => {
  try {
    const { markdown, aspect = 'horizontal', secondsPerSlide = 4 } = req.body;
    if (!markdown || !markdown.trim()) {
      return res.status(400).json({ error: 'Markdown content cannot be empty' });
    }

    const isVertical = aspect === 'vertical';
    const compiled = compileMarkdownToHtml(markdown, {
      secondsPerSlide: parseFloat(secondsPerSlide) || 4,
      width: isVertical ? 1080 : 1920,
      height: isVertical ? 1920 : 1080,
      aspect
    });

    const previewId = crypto.randomBytes(8).toString('hex');
    const previewFilename = `preview-md-${previewId}.html`;
    const previewFilePath = path.join(previewsDir, previewFilename);
    fs.writeFileSync(previewFilePath, compiled, 'utf8');

    const totalSlides = markdown.split(/\n\s*---\s*\n/).filter(s => s.trim()).length || 1;
    const duration = totalSlides * (parseFloat(secondsPerSlide) || 4);

    res.json({
      success: true,
      previewUrl: `/previews/${previewFilename}`,
      filename: previewFilename,
      slidesCount: totalSlides,
      duration,
      width: isVertical ? 1080 : 1920,
      height: isVertical ? 1920 : 1080
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save HTML Code Buffer to Live Preview
app.post('/api/preview-html', (req, res) => {
  try {
    const { htmlCode } = req.body;
    if (!htmlCode || !htmlCode.trim()) {
      return res.status(400).json({ error: 'HTML code cannot be empty' });
    }

    const previewId = crypto.randomBytes(8).toString('hex');
    const previewFilename = `preview-html-${previewId}.html`;
    const previewFilePath = path.join(previewsDir, previewFilename);
    fs.writeFileSync(previewFilePath, htmlCode, 'utf8');

    res.json({
      success: true,
      previewUrl: `/previews/${previewFilename}`,
      filename: previewFilename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload File directly to Preview
app.post('/api/preview-upload', upload.any(), (req, res) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.md' || ext === '.markdown') {
      const content = fs.readFileSync(file.path, 'utf8');
      const compiled = compileMarkdownToHtml(content, {
        secondsPerSlide: 4,
        width: 1920,
        height: 1080
      });
      const previewFilename = `preview-${path.basename(file.filename, ext)}.html`;
      fs.writeFileSync(path.join(previewsDir, previewFilename), compiled, 'utf8');

      return res.json({
        success: true,
        previewUrl: `/previews/${previewFilename}`,
        originalName: file.originalname,
        type: 'markdown',
        filePath: file.path
      });
    }

    // HTML file
    const previewFilename = `preview-${file.filename}`;
    fs.copyFileSync(file.path, path.join(previewsDir, previewFilename));

    res.json({
      success: true,
      previewUrl: `/previews/${previewFilename}`,
      originalName: file.originalname,
      type: 'html',
      filePath: file.path
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// HISTORY & VAULT APIS
// ==========================================

// Get filtered and sorted history
app.get('/api/history', (req, res) => {
  try {
    const { filter = 'all', search = '', sort = 'newest' } = req.query;
    historyStore.syncFromDisk();
    const records = historyStore.getFilteredHistory({ filter, search, sort });

    // Aggregate statistics
    const allRecords = historyStore.readRecords();
    const totalBytes = allRecords.reduce((sum, r) => sum + (r.bytes || 0), 0);
    const totalDurationSec = allRecords.reduce((sum, r) => sum + (r.durationSec || 0), 0);

    res.json({
      success: true,
      records,
      stats: {
        totalVideos: allRecords.length,
        totalSizeMb: (totalBytes / (1024 * 1024)).toFixed(2),
        totalDurationFormatted: formatDuration(totalDurationSec)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete history record and file on disk
app.delete('/api/history/:id', (req, res) => {
  try {
    const id = req.params.id;
    const ok = historyStore.deleteRecord(id);
    if (!ok) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, message: 'File and database record permanently purged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

// ==========================================
// CORE RENDER SSE PIPELINE
// ==========================================

async function handleRenderJob(req, res, inputPath, originalFilename, body) {
  const fps = parseInt(body.fps || '30', 10);
  const duration = body.duration && !isNaN(parseFloat(body.duration)) ? parseFloat(body.duration) : null;
  const resolution = (body.resolution || 'auto').toLowerCase();
  const useGpu = body.gpu !== 'software';

  let width = null, height = null;
  if (resolution === '1080p-v' || resolution === 'vertical') {
    width = 1080; height = 1920;
  } else if (resolution === '1080p' || resolution === 'horizontal') {
    width = 1920; height = 1080;
  } else if (resolution === 'square' || resolution === '1:1') {
    width = 1080; height = 1080;
  } else if (resolution === '720p') {
    width = 1280; height = 720;
  } else if (resolution === '4k') {
    width = 3840; height = 2160;
  }

  const baseCleanName = path.basename(originalFilename, path.extname(originalFilename)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputName = `render-${Date.now()}-${baseCleanName}.mp4`;
  const outputPath = path.join(outputDir, outputName);

  try {
    if (req.socket) req.socket.setTimeout(0);
    if (res.socket) res.socket.setTimeout(0);
  } catch(e) {}

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const sendSSE = (event, data) => {
    if (res.writableEnded || res.destroyed) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {}
  };

  // Announce initiated job metadata immediately for resilient mobile background tracking
  sendSSE('init', {
    filename: outputName,
    url: `/output/${outputName}`,
    timestamp: Date.now()
  });

  // Heartbeat to keep SSE socket active
  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      try { res.write(': ping\n\n'); } catch (e) {}
    }
  }, 4000);

  res.on('close', () => {
    clearInterval(heartbeat);
  });

  try {
    const isMarkdown = originalFilename.toLowerCase().endsWith('.md') || originalFilename.toLowerCase().endsWith('.markdown');
    const engine = new RendererEngine({
      width,
      height,
      fps,
      duration: duration || 5,
      useGpu
    });

    engine.on('status', data => sendSSE('status', data));
    engine.on('progress', data => sendSSE('progress', data));

    const metrics = await engine.renderHtmlToMp4(inputPath, outputPath, {
      width,
      height,
      fps,
      duration,
      useGpu
    });

    const probe = probeMedia(outputPath);

    // Save record to persistent history
    const record = historyStore.addRecord({
      filename: outputName,
      originalName: originalFilename,
      fileType: isMarkdown ? 'Markdown Presentation' : (probe.resolution?.includes('1920') && width === 1080 ? 'Reel 9:16' : 'HTML5 Animation'),
      probe,
      metrics
    });

    sendSSE('complete', {
      success: true,
      filename: outputName,
      url: `/output/${outputName}`,
      record,
      metrics,
      probe
    });
  } catch (err) {
    console.error('[Render Job Exception]:', err);
    sendSSE('error', { error: err.message });
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
}

// Upload file & render (accepts any field name: htmlFile or file)
app.post('/api/upload-render', upload.any(), (req, res) => {
  const file = req.file || (req.files && req.files[0]);
  if (!file) return res.status(400).json({ error: 'No file uploaded for rendering' });
  handleRenderJob(req, res, file.path, file.originalname, req.body);
});

// Render raw code string
app.post('/api/render-code-sse', (req, res) => {
  const { code, format = 'html', filename = 'source.html' } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: 'No source code provided' });

  const ext = format === 'markdown' ? '.md' : '.html';
  const cleanFilename = filename.endsWith(ext) ? filename : `${filename}${ext}`;
  const tempFile = path.join(uploadDir, `${Date.now()}-${cleanFilename}`);
  fs.writeFileSync(tempFile, code, 'utf8');

  handleRenderJob(req, res, tempFile, cleanFilename, req.body);
});

// UI Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/history', (req, res) => {
  res.redirect('/?tab=history');
});

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  HTML/MD to MP4 Master Engine Online!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Access URL: http://localhost:${PORT}`);
  console.log(`  History URL: http://localhost:${PORT}/history`);
  console.log(`======================================================\n`);
});

server.timeout = 0;
server.keepAliveTimeout = 0;
if (server.requestTimeout !== undefined) server.requestTimeout = 0;

module.exports = app;