// Start server + run tests so user can see live data
import { spawn, execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start server
const server = spawn('node', [join(__dirname, 'server.mjs'), '3456'], {
  stdio: 'pipe',
  detached: false,
});
server.stdout.on('data', d => process.stdout.write(d));
server.stderr.on('data', d => process.stderr.write(d));

// Wait for server to start
await new Promise(r => setTimeout(r, 1500));

// Run behavioral tests
console.log('\n--- Running behavioral tests ---\n');
try {
  const out = execSync('node tests/runner.js --bc', {
    cwd: join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
  });
  console.log(out);
} catch (e) {
  console.log(e.stdout || e.message);
}

console.log('\n✅ Tests done. Server running at http://localhost:3456');
console.log('Refresh browser to see live data!');

// Keep server alive for a while
await new Promise(r => setTimeout(r, 60000));
server.kill();
