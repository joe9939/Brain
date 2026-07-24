import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const src = 'C:/Users/86189/Desktop/chan-opencode/.playwright-mcp';
const dst = 'C:/Users/86189/Desktop/brain-agent/docs';

const files = readdirSync(src).filter(f => f.startsWith('frame') && f.endsWith('.png'));
files.forEach(f => {
  const buf = readFileSync(join(src, f));
  writeFileSync(join(dst, f), buf);
});
console.log(`Copied ${files.length} frames`);
