import { spawn, execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Start server
const server = spawn('node', [join(__dirname, 'server.mjs'), '3456'], { stdio: 'inherit' });
await new Promise(r => setTimeout(r, 1500));

// Run tests to generate data
console.log('\n--- Running tests ---\n');
try {
  const out = execSync('node tests/runner.js --bc', { cwd: join(__dirname, '..'), encoding: 'utf8', timeout: 30000 });
  console.log(out);
} catch (e) { console.log(e.stdout || e.message); }

// Keep alive so user can refresh
console.log('\n✅ Server live at http://localhost:3456');
console.log('Close this window to stop server.\n');
await new Promise(r => setTimeout(r, 120000));
server.kill();
