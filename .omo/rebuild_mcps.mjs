import { execSync } from 'child_process';
import { existsSync, copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:/Users/86189/Desktop/brain-agent';
const MCPS = ['memory-store','reward-system','tool-tracker','world-model'];

for (const m of MCPS) {
  const srcDir = join(ROOT, 'src/mcp', m);
  const dstDir = join(ROOT, '.opencode/mcp', m);
  
  // Ensure dst dirs exist
  mkdirSync(join(dstDir, 'dist'), { recursive: true });
  
  // Copy node_modules if they exist
  const srcNm = join(srcDir, 'node_modules');
  const dstNm = join(dstDir, 'node_modules');
  if (existsSync(srcNm)) {
    execSync(`xcopy /E /I /Y "${srcNm}" "${dstNm}" 2>nul`, { stdio: 'pipe', timeout: 30000 });
    console.log(m + ': node_modules copied');
  }
  
  // Build
  try {
    execSync('npm run build 2>&1', { cwd: srcDir, stdio: 'pipe', timeout: 60000, shell: true });
    console.log(m + ': built OK');
  } catch(e) {
    console.log(m + ': build threw: ' + e.message.slice(0, 100));
  }
  
  // Copy dist .js files (not .d.ts)
  const srcDist = join(srcDir, 'dist');
  const dstDist = join(dstDir, 'dist');
  if (existsSync(srcDist)) {
    const files = readdirSync(srcDist).filter(f => f.endsWith('.js'));
    for (const f of files) {
      copyFileSync(join(srcDist, f), join(dstDist, f));
    }
    console.log(m + ': dist copied (' + files.length + ' files)');
  }
}
console.log('ALL MCPs REBUILT');
