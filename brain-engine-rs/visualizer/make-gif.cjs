const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gif-encoder');
const { PNG } = require('pngjs');

const dir = path.join(__dirname, '..', 'docs');

// Load frames (use up to 4 for smaller file)
const frames = [];
for (let i = 0; i < 4; i++) {
  try { frames.push(PNG.sync.read(fs.readFileSync(path.join(dir, `frame${i}.png`)))); } catch {}
}
if (frames.length < 2) { console.log('Need frames'); process.exit(1); }

const w = Math.min(frames[0].width, 300);  // smaller for GIF
const h = Math.min(frames[0].height, 200);

// Simple downscale function
function downscale(png, tw, th) {
  const buf = Buffer.alloc(tw * th * 4);
  const sx = png.width / tw, sy = png.height / th;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = (Math.floor(y * sy) * png.width + Math.floor(x * sx)) * 4;
      const di = (y * tw + x) * 4;
      buf[di] = png.data[si]; buf[di+1] = png.data[si+1];
      buf[di+2] = png.data[si+2]; buf[di+3] = 255;
    }
  }
  return buf;
}

const encoder = new GIFEncoder(w, h);
const outPath = path.join(dir, 'visualizer-demo.gif');
const outStream = fs.createWriteStream(outPath);

// Pipe to file while writing
encoder.pipe(outStream);

encoder.on('error', e => { console.log('Error:', e.message); });

encoder.writeHeader();
encoder.setRepeat(0);
encoder.setDelay(500);

frames.forEach(f => {
  encoder.addFrame(downscale(f, w, h));
});

encoder.finish();

outStream.on('close', () => {
  const size = fs.statSync(outPath).size;
  console.log(`GIF: ${outPath} (${(size/1024).toFixed(0)}KB, ${frames.length} frames)`);
});
