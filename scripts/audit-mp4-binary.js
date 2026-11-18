const fs = require('fs');
const path = require('path');

function parseMp4Atoms(filePath) {
  const buf = fs.readFileSync(filePath);
  console.log(`\n=== Auditing MP4 File: ${path.basename(filePath)} (${buf.length} bytes) ===`);

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
      // 64-bit size
      if (offset + 16 > buf.length) {
        console.warn(`[WARN] Incomplete 64-bit atom at offset ${offset}`);
        break;
      }
      // BigInt 64-bit size
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size === 0) {
      // Atom extends to end of file
      size = buf.length - offset;
    }

    atoms.push({ type, offset, size, headerSize });
    console.log(`Atom '${type}' found at offset 0x${offset.toString(16)} (${offset}), size: ${size} bytes`);

    if (size <= 0) {
      console.error(`[ERROR] Invalid atom size ${size} at offset ${offset}`);
      break;
    }
    offset += size;
  }

  // Deep inspect ftyp
  const ftyp = atoms.find(a => a.type === 'ftyp');
  if (ftyp) {
    const majorBrand = buf.toString('ascii', ftyp.offset + 8, ftyp.offset + 12);
    const minorVersion = buf.readUInt32BE(ftyp.offset + 12);
    const compatibleBrands = [];
    for (let c = ftyp.offset + 16; c < ftyp.offset + ftyp.size; c += 4) {
      compatibleBrands.push(buf.toString('ascii', c, c + 4));
    }
    console.log(`\n[FTYP Details]:`);
    console.log(`  Major Brand: '${majorBrand}'`);
    console.log(`  Minor Version: ${minorVersion}`);
    console.log(`  Compatible Brands: ${compatibleBrands.join(', ')}`);
  } else {
    console.error(`[ERROR] Missing 'ftyp' atom!`);
  }

  // Deep inspect moov
  const moov = atoms.find(a => a.type === 'moov');
  const mdat = atoms.find(a => a.type === 'mdat');

  if (moov && mdat) {
    console.log(`\n[Fast-Start Check]:`);
    if (moov.offset < mdat.offset) {
      console.log(`  SUCCESS: 'moov' atom (offset ${moov.offset}) precedes 'mdat' atom (offset ${mdat.offset}). Fast-start (web streaming) is ENABLED!`);
    } else {
      console.warn(`  NOTE: 'mdat' atom (offset ${mdat.offset}) precedes 'moov' atom (offset ${moov.offset}). Not fast-start optimized.`);
    }
  }

  // Inspect moov children for video codecs
  if (moov) {
    console.log(`\n[MOOV Content Inspection]:`);
    const moovBuf = buf.subarray(moov.offset, moov.offset + moov.size);
    // Search for 'avc1' or 'hvc1' or 'vp09' or 'mp4a'
    const containsAvc1 = moovBuf.includes(Buffer.from('avc1', 'ascii'));
    const containsMp4a = moovBuf.includes(Buffer.from('mp4a', 'ascii'));
    const containsHdlr = moovBuf.includes(Buffer.from('hdlr', 'ascii'));
    const containsMvhd = moovBuf.includes(Buffer.from('mvhd', 'ascii'));
    const containsTrak = moovBuf.includes(Buffer.from('trak', 'ascii'));

    console.log(`  Contains 'mvhd' (Movie Header): ${containsMvhd}`);
    console.log(`  Contains 'trak' (Track): ${containsTrak}`);
    console.log(`  Contains 'hdlr' (Handler Reference): ${containsHdlr}`);
    console.log(`  Contains 'avc1' (H.264 Video Codec): ${containsAvc1}`);
    console.log(`  Contains 'mp4a' (AAC Audio Codec): ${containsMp4a}`);
  }

  return { atoms, hasFtyp: !!ftyp, hasMoov: !!moov, hasMdat: !!mdat };
}

const downloadDir = path.join(__dirname, '..', 'tmp-downloads-e2e');
const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.mp4'));
if (files.length === 0) {
  console.log('No .mp4 files found in tmp-downloads-e2e');
} else {
  files.forEach(f => parseMp4Atoms(path.join(downloadDir, f)));
}
