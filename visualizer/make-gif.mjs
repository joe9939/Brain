import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GIFEncoder from 'gif-encoder';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs');
mkdirSync(outDir, { recursive: true });

async function main() {
  // Use Playwright (browser_run_code_unsafe won't work from here, so we save individual screenshots)
  // Instead, use the existing frames if available, or instructions for the user
  
  // For now, create GIF from the 4 frames we have
  let frameCount = 0;
  const frames = [];
  
  for (let i = 0; i < 8; i++) {
    try {
      const png = PNG.sync.read(readFileSync(join(outDir, `frame${i}.png`)));
      frames.push(png);
      frameCount++;
    } catch {
      // Try alternate naming
      try {
        const png = PNG.sync.read(readFileSync(join(__dirname, '..', '.playwright-mcp', `gif-f${i}.png`)));
        frames.push(png);
        frameCount++;
      } catch {}
    }
  }

  if (frameCount < 2) {
    console.log('Need at least 2 frames. Taking new screenshots via Playwright...');
    // Can't do this from here, tell user
    console.log('Run these steps manually:');
    console.log('1. Open http://localhost:3456');
    console.log('2. Use Playwright to capture frames at different rotations');
    console.log('3. Re-run this script');
    process.exit(1);
  }

  const w = frames[0].width;
  const h = frames[0].height;
  
  const encoder = new GIFEncoder(Math.min(w, 600), Math.min(h, 400));
  const gifStream = encoder.createReadStream();
  const chunks = [];
  
  gifStream.on('data', c => chunks.push(c));
  gifStream.on('end', () => {
    const gif = Buffer.concat(chunks);
    writeFileSync(join(outDir, 'visualizer-demo.gif'), gif);
    console.log(`✅ GIF created: docs/visualizer-demo.gif (${(gif.length/1024).toFixed(0)}KB, ${frameCount} frames)`);
  });

  encoder.start();
  encoder.setRepeat(0); // loop forever
  encoder.setDelay(600); // 600ms per frame
  
  for (const frame of frames) {
    // Resize if needed
    const resized = frame;
    encoder.addFrame(resized.data);
  }
  
  encoder.finish();
}

main().catch(e => { console.error(e); process.exit(1); });
