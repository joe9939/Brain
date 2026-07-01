import { spawn } from 'child_process';
import { resolve } from 'path';

const mcps = ['memory-store', 'reward-system', 'tool-tracker', 'world-model',
              'monitor', 'priority-queue', 'reflexion', 'sop-tracker'];

async function testMCP(name) {
  const serverPath = resolve('.opencode/mcp', name, 'dist/server.js');
  return new Promise(resolve => {
    const p = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 });
    const out = [];
    p.stdout.on('data', d => out.push(d.toString()));
    p.stderr.on('data', d => out.push(d.toString()));
    
    // Send MCP initialize request
    const init = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } }) + '\n';
    p.stdin.write(init);
    
    setTimeout(() => {
      const output = out.join('').slice(0, 200);
      if (p.exitCode !== null && p.exitCode !== 0) {
        console.log(`${name}: EXITED(${p.exitCode}) ${output.slice(0,100)}`);
      } else if (output.includes('jsonrpc')) {
        console.log(`${name}: OK - responded`);
      } else {
        console.log(`${name}: RUNNING - ${output.slice(0,100)}`);
      }
      p.kill();
      resolve();
    }, 2000);
  });
}

for (const m of mcps) await testMCP(m);
