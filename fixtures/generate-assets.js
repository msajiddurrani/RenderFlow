const fs = require('fs');
const path = require('path');

// Generate a valid 3-second 44.1kHz 16-bit Mono PCM WAV file with an 880Hz arpeggiated tone
function generateWav(durationSec = 3, sampleRate = 44100) {
  const numSamples = durationSec * sampleRate;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // Sub-chunk 1 (fmt )
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16 bit)

  // Sub-chunk 2 (data)
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Fill audio samples with musical arpeggio (C4, E4, G4, C5)
  const notes = [261.63, 329.63, 392.00, 523.25];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.floor(t * 2) % notes.length;
    const freq = notes[noteIdx];
    // Envelope: slight decay per note
    const noteT = (t * 2) % 1;
    const envelope = Math.max(0, 1 - noteT * 0.8);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.6 * envelope;
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intSample)), 44 + i * 2);
  }

  return buffer;
}

const wavBuffer = generateWav(3);
const wavPath = path.join(__dirname, 'test-sound.wav');
fs.writeFileSync(wavPath, wavBuffer);
console.log(`Generated WAV sound at ${wavPath} (${wavBuffer.length} bytes)`);

// Also create base64 string
const base64Wav = 'data:audio/wav;base64,' + wavBuffer.toString('base64');
fs.writeFileSync(path.join(__dirname, 'test-sound-base64.txt'), base64Wav);
console.log('Generated base64 sound data URI');
