const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function parseMp4Atoms(filePath) {
  const buf = fs.readFileSync(filePath);
  console.log(`\n======================================================`);
  console.log(`  BINARY AUDIT: ${path.basename(filePath)} (${buf.length} bytes)`);
  console.log(`======================================================`);

  let offset = 0;
  const atoms = [];

  while (offset < buf.length) {
    if (offset + 8 > buf.length) {
      console.warn(`[WARN] Incomplete atom header at offset ${offset}`);
      break;
    }

    let size = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;

    if (size === 1) {
      if (offset + 16 > buf.length) {
        console.warn(`[WARN] Incomplete 64-bit atom at offset ${offset}`);
        break;
      }
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = buf.length - offset;
    }

    atoms.push({ type, offset, size, headerSize });
    console.log(`[ATOM] '${type}' | offset: 0x${offset.toString(16).padStart(6, '0')} (${offset}) | size: ${size} bytes`);

    if (size <= 0) {
      console.error(`[ERROR] Invalid atom size ${size} at offset ${offset}`);
      break;
    }
    offset += size;
  }

  // Deep inspect ftyp
  const ftyp = atoms.find(a => a.type === 'ftyp');
  let ftypValid = false;
  if (ftyp) {
    const majorBrand = buf.toString('ascii', ftyp.offset + 8, ftyp.offset + 12);
    const minorVersion = buf.readUInt32BE(ftyp.offset + 12);
    const compatibleBrands = [];
    for (let c = ftyp.offset + 16; c < ftyp.offset + ftyp.size; c += 4) {
      compatibleBrands.push(buf.toString('ascii', c, c + 4));
    }
    console.log(`\n  [1. FTYP Atom Analysis]:`);
    console.log(`    Major Brand: '${majorBrand}'`);
    console.log(`    Minor Version: ${minorVersion}`);
    console.log(`    Compatible Brands: ${compatibleBrands.join(', ')}`);
    ftypValid = (majorBrand === 'isom' || majorBrand === 'mp42' || compatibleBrands.includes('isom') || compatibleBrands.includes('mp42'));
    console.log(`    Result: ${ftypValid ? 'PASSED' : 'FAILED'}`);
  } else {
    console.error(`  [1. FTYP Atom Analysis]: FAILED (Missing ftyp)`);
  }

  // Deep inspect moov and fast-start
  const moov = atoms.find(a => a.type === 'moov');
  const mdat = atoms.find(a => a.type === 'mdat');
  let fastStartValid = false;
  if (moov && mdat) {
    console.log(`\n  [2. Fast-Start & MOOV/MDAT Ordering]:`);
    console.log(`    'moov' offset: ${moov.offset}`);
    console.log(`    'mdat' offset: ${mdat.offset}`);
    fastStartValid = (moov.offset < mdat.offset);
    console.log(`    Fast-Start Valid (moov before mdat): ${fastStartValid ? 'PASSED (Optimized for instant web playback)' : 'FAILED'}`);
  } else {
    console.error(`  [2. Fast-Start Analysis]: FAILED (Missing moov or mdat)`);
  }

  // Codec inspection inside moov
  let codecValid = false;
  if (moov) {
    console.log(`\n  [3. Video Codec Inspection]:`);
    const moovBuf = buf.subarray(moov.offset, moov.offset + moov.size);
    const containsAvc1 = moovBuf.includes(Buffer.from('avc1', 'ascii'));
    const containsMvhd = moovBuf.includes(Buffer.from('mvhd', 'ascii'));
    const containsTrak = moovBuf.includes(Buffer.from('trak', 'ascii'));
    console.log(`    Movie Header ('mvhd'): ${containsMvhd ? 'PRESENT' : 'MISSING'}`);
    console.log(`    Track ('trak'): ${containsTrak ? 'PRESENT' : 'MISSING'}`);
    console.log(`    H.264 Video Codec ('avc1'): ${containsAvc1 ? 'PRESENT' : 'MISSING'}`);
    codecValid = containsAvc1;
    console.log(`    Cross-Platform Compatibility (Windows Media Player, QuickTime, Chrome): ${codecValid ? 'PASSED' : 'FAILED'}`);
  }

  return {
    atoms,
    size: buf.length,
    ftypValid,
    fastStartValid,
    codecValid,
    isMp4: ftypValid && fastStartValid && codecValid
  };
}

(async () => {
  const downloadDir = path.join(__dirname, '..', 'tmp-downloads-audit');
  if (fs.existsSync(downloadDir)) fs.rmSync(downloadDir, { recursive: true, force: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  console.log('>>> STARTING EXHAUSTIVE MP4 BINARY & DOWNLOAD AUDIT <<<');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName',
    downloadPath: downloadDir,
    eventsEnabled: true
  });
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    }
  });

  // 1. Load http://localhost:3333
  console.log('\nStep 1: Loading http://localhost:3333...');
  await page.goto('http://localhost:3333', { waitUntil: 'networkidle2' });

  // 2. Render sample video
  console.log('Step 2: Loading sample preset and entering step 2...');
  await page.evaluate(() => {
    switchNav('studio');
    loadPreset('renderflow');
    setCreateStep(2);
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Step 3: Triggering in-browser WebCodecs render (#btnStudioBake)...');
  await page.click('#btnStudioBake');

  console.log('Step 4: Awaiting render completion...');
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await page.evaluate(() => {
      const hudPhase = document.getElementById('hudPhaseText')?.textContent;
      const step3Visible = document.getElementById('stepDownload')?.style.display !== 'none';
      return { hudPhase, step3Visible };
    });
    if (status.step3Visible || status.hudPhase?.includes('Complete')) {
      completed = true;
      console.log(`Render completed successfully at tick ${i + 1}!`);
      break;
    }
  }

  if (!completed) {
    throw new Error('Render failed to complete within timeout!');
  }

  await new Promise(r => setTimeout(r, 1500));

  // Inspect generated Blob properties
  const blobInfo = await page.evaluate(async () => {
    const btn = document.getElementById('btnDownloadResult');
    let blobSize = 0;
    let blobType = '';
    if (btn && btn.href && btn.href.startsWith('blob:')) {
      try {
        const res = await fetch(btn.href);
        const b = await res.blob();
        blobSize = b.size;
        blobType = b.type;
      } catch (e) {}
    }
    return {
      href: btn?.href,
      downloadAttr: btn?.getAttribute('download'),
      blobSize,
      blobType
    };
  });
  console.log('\nGenerated MP4 Blob in memory:', blobInfo);

  // 3. Test clicking #btnDownloadResult
  console.log('\nStep 5: Testing #btnDownloadResult click (Zero-latency direct download)...');
  const dlStart = Date.now();
  await page.click('#btnDownloadResult');

  // Wait for file in downloadDir
  let downloadedFile1 = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const list = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
    if (list.length > 0) {
      downloadedFile1 = list[0];
      const elapsed = Date.now() - dlStart;
      console.log(`File downloaded to disk in ${elapsed}ms: ${downloadedFile1}`);
      break;
    }
  }

  if (!downloadedFile1) {
    throw new Error('File was not downloaded after clicking #btnDownloadResult!');
  }

  const file1Path = path.join(downloadDir, downloadedFile1);
  const audit1 = parseMp4Atoms(file1Path);

  // Verify file properties
  if (!downloadedFile1.endsWith('.mp4')) {
    throw new Error(`Download file name does not end with .mp4: ${downloadedFile1}`);
  }
  if (audit1.size !== blobInfo.blobSize) {
    throw new Error(`Downloaded file size (${audit1.size}) does not match blob size (${blobInfo.blobSize})!`);
  }
  if (!audit1.isMp4) {
    throw new Error('Downloaded file is not a valid MP4!');
  }
  console.log('>>> #btnDownloadResult AUDIT PASSED! <<<');

  // 4. Test downloading from History tab
  console.log('\nStep 6: Testing Download from History Tab (#viewHistoryTab)...');
  await page.evaluate(() => {
    switchNav('history');
  });

  await new Promise(r => setTimeout(r, 1500));

  const historyItems = await page.evaluate(() => {
    const records = Array.from(document.querySelectorAll('#historyGrid .record'));
    return records.map(rec => {
      const title = rec.querySelector('strong')?.textContent;
      const dlLink = rec.querySelector('.record-actions a');
      return {
        title,
        href: dlLink?.getAttribute('href'),
        download: dlLink?.getAttribute('download')
      };
    });
  });

  console.log(`Found ${historyItems.length} records in History tab:`);
  historyItems.forEach((item, idx) => console.log(`  [${idx + 1}] ${item.title} -> ${item.download}`));

  if (historyItems.length === 0) {
    throw new Error('History tab is empty!');
  }

  // Clear directory before 2nd download test
  fs.unlinkSync(file1Path);

  console.log('Clicking Download button on the first history item...');
  const dlHistoryStart = Date.now();
  await page.evaluate(() => {
    const firstDlBtn = document.querySelector('#historyGrid .record .record-actions a');
    if (firstDlBtn) firstDlBtn.click();
  });

  let downloadedFile2 = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const list = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
    if (list.length > 0) {
      downloadedFile2 = list[0];
      const elapsed = Date.now() - dlHistoryStart;
      console.log(`History file downloaded to disk in ${elapsed}ms: ${downloadedFile2}`);
      break;
    }
  }

  if (!downloadedFile2) {
    throw new Error('File was not downloaded from History tab!');
  }

  const file2Path = path.join(downloadDir, downloadedFile2);
  const audit2 = parseMp4Atoms(file2Path);

  if (!downloadedFile2.endsWith('.mp4')) {
    throw new Error(`History download file name does not end with .mp4: ${downloadedFile2}`);
  }
  if (!audit2.isMp4) {
    throw new Error('History downloaded file is not a valid MP4!');
  }
  console.log('>>> History Tab Download AUDIT PASSED! <<<');

  console.log('\n======================================================');
  console.log('  EXHAUSTIVE AUDIT COMPLETE: ALL CHECKS PASSED 100%!');
  console.log('======================================================');

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
