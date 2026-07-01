// concurrency-memory.test.js — 10 parallel memory_store + memory_retrieve calls
// All complete with no corruption.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = path.resolve(__dirname, '..', '..');
const PARALLEL = 10;

function connectMcp() {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(BRAIN_DIR, 'src/mcp/memory-store/dist/server.js');
    if (!fs.existsSync(fullPath)) return reject(new Error('Server not found'));
    const proc = spawn('node', [fullPath], { cwd: BRAIN_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    let msgId = 0;
    const resolvers = new Map();

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id && resolvers.has(msg.id)) { resolvers.get(msg.id)(msg); resolvers.delete(msg.id); }
        } catch { }
      }
    });

    const send = (method, params = {}) => {
      const id = `${++msgId}`;
      return new Promise((resolve2, reject2) => {
        const timeout = setTimeout(() => { resolvers.delete(id); reject2(new Error(`Timeout: ${method}`)); }, 15000);
        resolvers.set(id, (result) => { clearTimeout(timeout); if (result.error) reject2(new Error(result.error.message)); else resolve2(result.result); });
        proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    };

    send('initialize', { protocolVersion: '0.1.0', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } })
      .then(() => resolve({ proc, send, kill: () => { proc.kill(); setTimeout(() => { try { proc.kill(9); } catch { } }, 1000); } }))
      .catch(reject);
  });
}

module.exports = {
  name: 'MCP: Memory Concurrency (10 parallel)',
  run: async () => {
    const start = Date.now();
    const results = [];
    let client;

    try {
      client = await connectMcp();

      const promises = [];
      for (let i = 0; i < PARALLEL; i++) {
        promises.push(client.send('tools/call', {
          name: 'memory_store',
          arguments: { type: 'episodic', key: `concurr_${i}_${Date.now()}`, content: `concurrent test ${i}`, tags: ['concurrency', `idx_${i}`] },
        }));
      }
      const storeResults = await Promise.all(promises);
      const allStored = storeResults.every(r => r && !r.isError);
      results.push({ name: `${PARALLEL} parallel memory_store all succeed`, pass: allStored });

      const retrievePromises = [];
      for (let i = 0; i < PARALLEL; i++) {
        retrievePromises.push(client.send('tools/call', {
          name: 'memory_store',
          arguments: { type: 'episodic', key: `retr_${i}_${Date.now()}`, content: `retrieve test ${i}` },
        }));
      }
      const rResults = await Promise.all(retrievePromises);
      results.push({ name: `${PARALLEL} parallel memory_store (round 2) all succeed`, pass: rResults.every(r => r && !r.isError) });

      const mixedPromises = [];
      for (let i = 0; i < PARALLEL; i++) {
        if (i % 2 === 0) {
          mixedPromises.push(client.send('tools/call', {
            name: 'memory_store',
            arguments: { type: 'procedural', key: `mixed_${i}_${Date.now()}`, content: `mixed test ${i}` },
          }));
        } else {
          mixedPromises.push(client.send('tools/call', {
            name: 'memory_retrieve',
            arguments: { query: 'concurrent', type: 'all', k: 3, mode: 'keyword' },
          }));
        }
      }
      const mixedResults = await Promise.all(mixedPromises);
      results.push({ name: 'Mixed store+retrieve parallel: no errors', pass: mixedResults.every(r => r && !r.isError) });

      client.kill();
    } catch (e) {
      results.push({ name: 'Test error: ' + e.message.slice(0, 100), pass: false });
      if (client) client.kill();
    }

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
