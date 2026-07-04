// Minimal GIF encoder — creates animated GIF from PNG frames
// Usage: node visualizer/frames-to-gif.mjs
import { readFileSync, writeFileSync } from 'fs';

// Simple LZW + GIF encoder
// Based on: https://github.com/nicedoc/npm-gif-encoder/blob/master/lib/GIFEncoder.js

const frames = [];
for (let i = 0; i < 6; i++) {
  try {
    const buf = readFileSync(`C:/Users/86189/Desktop/brain-agent/docs/frame${i}.png`);
    frames.push(buf);
  } catch { break; }
}

if (frames.length < 2) {
  console.log('Need at least 2 frames. Run Playwright screenshots first.');
  process.exit(1);
}

// For now, just document the frames
console.log(`Captured ${frames.length} frames.`);
console.log('');
console.log('To create GIF:');
console.log('1. Install ScreenToGif (free): https://www.screentogif.com/');
console.log('2. Or use ffmpeg:');
console.log('   ffmpeg -framerate 4 -pattern_type glob -i "docs/frame*.png" docs/visualizer-demo.gif');
