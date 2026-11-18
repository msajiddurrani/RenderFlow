const fs = require('fs');
const path = require('path');
const { probeMedia } = require('./verify-mp4');

const DB_PATH = path.resolve(__dirname, '../output/history.json');
const OUTPUT_DIR = path.resolve(__dirname, '../output');

class HistoryStore {
  constructor() {
    this.ensureDb();
    this.syncFromDisk();
  }

  ensureDb() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');
    }
  }

  readRecords() {
    try {
      this.ensureDb();
      const content = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(content || '[]');
    } catch (err) {
      console.error('[HistoryStore] Read error:', err.message);
      return [];
    }
  }

  writeRecords(records) {
    try {
      this.ensureDb();
      fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), 'utf8');
    } catch (err) {
      console.error('[HistoryStore] Write error:', err.message);
    }
  }

  /**
   * Sync existing files on disk into the database so none are missing
   */
  syncFromDisk() {
    const existing = this.readRecords();
    const existingMap = new Map(existing.map(r => [r.filename, r]));
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => 
      f.endsWith('.mp4') && 
      !f.endsWith('.tmp.mp4') && 
      !f.includes('.tmp.') &&
      !f.endsWith('.part')
    );

    let changed = false;
    for (const f of files) {
      if (!existingMap.has(f)) {
        const fullPath = path.join(OUTPUT_DIR, f);
        const stat = fs.statSync(fullPath);
        if (stat.size < 50000) continue; // Skip incomplete or empty files

        const probe = probeMedia(fullPath);
        if (!probe.videoCodec || probe.videoCodec === 'None' || probe.resolution === 'Unknown') {
          continue; // In-progress render or corrupt stream
        }

        const record = {
          id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          filename: f,
          originalName: f.replace(/^render-\d+-/, ''),
          fileType: f.includes('Reel') ? 'Reel 9:16' : 'Video',
          resolution: probe.resolution || '1080p',
          duration: probe.duration || '00:00:05',
          durationSec: this.parseDurationToSec(probe.duration),
          sizeKb: (stat.size / 1024).toFixed(1),
          bytes: stat.size,
          videoCodec: probe.videoCodec || 'h264',
          audioCodec: probe.audioCodec || 'aac',
          createdAt: stat.mtimeMs,
          url: `/output/${f}`
        };
        existing.push(record);
        changed = true;
      }
    }

    // Filter out files that no longer exist on disk or are corrupted/incomplete
    const valid = existing.filter(r => 
      fs.existsSync(path.join(OUTPUT_DIR, r.filename)) &&
      r.resolution !== 'Unknown' &&
      r.videoCodec !== 'None'
    );
    if (valid.length !== existing.length || changed) {
      this.writeRecords(valid);
    }
  }

  parseDurationToSec(durStr) {
    if (!durStr || durStr === 'Unknown') return 5;
    const parts = durStr.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return 5;
  }

  addRecord(data) {
    const records = this.readRecords();
    const fullPath = path.join(OUTPUT_DIR, data.filename);
    const stat = fs.existsSync(fullPath) ? fs.statSync(fullPath) : { size: 0, mtimeMs: Date.now() };

    const newRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      filename: data.filename,
      originalName: data.originalName || data.filename,
      fileType: data.fileType || 'HTML',
      resolution: data.probe?.resolution || '1920x1080',
      duration: data.probe?.duration || '00:00:05',
      durationSec: this.parseDurationToSec(data.probe?.duration),
      sizeKb: (stat.size / 1024).toFixed(1),
      bytes: stat.size,
      videoCodec: data.probe?.videoCodec || 'h264',
      audioCodec: data.probe?.audioCodec || 'aac',
      metrics: data.metrics || null,
      createdAt: Date.now(),
      url: `/output/${data.filename}`
    };

    records.unshift(newRecord);
    this.writeRecords(records);
    return newRecord;
  }

  deleteRecord(id) {
    const records = this.readRecords();
    const target = records.find(r => r.id === id || r.filename === id);
    if (!target) return false;

    // Delete file from disk
    const targetFile = path.join(OUTPUT_DIR, target.filename);
    try {
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
      const targetAudio = targetFile.replace(/\.mp4$/i, '-audio.wav');
      if (fs.existsSync(targetAudio)) fs.unlinkSync(targetAudio);
    } catch (e) {
      console.warn('[HistoryStore] Could not delete disk file:', e.message);
    }

    const filtered = records.filter(r => r.id !== id && r.filename !== id);
    this.writeRecords(filtered);
    return true;
  }

  getFilteredHistory(options = {}) {
    const records = this.readRecords();
    const filter = options.filter || 'all';
    const search = (options.search || '').toLowerCase().trim();
    const sort = options.sort || 'newest';

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let result = records.filter(r => {
      // Date filter
      if (filter === 'today') {
        const itemDate = new Date(r.createdAt).toDateString();
        const todayDate = new Date().toDateString();
        if (itemDate !== todayDate && (now - r.createdAt) > oneDay) return false;
      } else if (filter === 'week') {
        if ((now - r.createdAt) > oneWeek) return false;
      } else if (filter === 'month') {
        if ((now - r.createdAt) > oneMonth) return false;
      }

      // Search filter
      if (search) {
        const matchName = (r.filename || '').toLowerCase().includes(search);
        const matchOrig = (r.originalName || '').toLowerCase().includes(search);
        const matchType = (r.fileType || '').toLowerCase().includes(search);
        const matchRes = (r.resolution || '').toLowerCase().includes(search);
        if (!matchName && !matchOrig && !matchType && !matchRes) return false;
      }

      return true;
    });

    // Sorting
    if (sort === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'oldest') {
      result.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sort === 'size') {
      result.sort((a, b) => b.bytes - a.bytes);
    } else if (sort === 'duration') {
      result.sort((a, b) => b.durationSec - a.durationSec);
    }

    return result;
  }
}

module.exports = new HistoryStore();
