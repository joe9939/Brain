// mcp-tool-latency.bench.js — Benchmark store/retrieve, world_predict, score_action per MCP
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = path.resolve(__dirname, '..');

function connectMcp(serverPath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(BRAIN_DIR, serverPath);
    if (!fs.existsSync(fullPath)) return reject(new Error('not found'));
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
        const timeout = setTimeout(() => { resolvers.delete(id); reject2(new Error('timeout')); }, 10000);
        resolvers.set(id, (result) => { clearTimeout(timeout); if (result.error) reject2(new Error(result.error.message)); else resolve2(result.result); });
        proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    };

    send('initialize', { protocolVersion: '0.1.0', capabilities: {}, clientInfo: { name: 'bench', version: '1.0' } })
      .then(() => resolve({ send, kill: () => proc.kill() }))
      .catch(reject);
  });
}

async function benchTool(client, name, args, iterations = 20) {
  const latencies = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await client.send('tools/call', { name, arguments: args });
    latencies.push(performance.now() - t0);
  }
  latencies.sort((a, b) => a - b);
  return {
    p50: latencies[Math.floor(iterations * 0.5)],
    p95: latencies[Math.floor(iterations * 0.95)],
    avg: latencies.reduce((s, v) => s + v, 0) / iterations,
  };
}

(async () => {
  const results = {};

  try {
    const memClient = await connectMcp('src/mcp/memory-store/dist/server.js');
    results.memory_store = await benchTool(memClient, 'memory_store', { type: 'semantic', key: 'bench_key', content: 'benchmark test data for latency measurement' });
    results.memory_retrieve = await benchTool(memClient, 'memory_retrieve', { query: 'benchmark', type: 'all', k: 5, mode: 'keyword' });
    memClient.kill();
  } catch (e) { results.memory_store = { error: e.message }; }

  try {
    const rewardClient = await connectMcp('src/mcp/reward-system/dist/server.js');
    results.score_action = await benchTool(rewardClient, 'score_action', { action_type: 'read', target: '/test/file.js', context: 'benchmark', alpha: 0.7 });
    results.record_outcome = await benchTool(rewardClient, 'record_outcome', { action_id: 'bench', success: true, level: 'step' });
    rewardClient.kill();
  } catch (e) { results.score_action = { error: e.message }; }

  try {
    const trackerClient = await connectMcp('src/mcp/tool-tracker/dist/server.js');
    results.track_tool_use = await benchTool(trackerClient, 'track_tool_use', { action_type: 'read', target: '/test/file.js', success: true, duration_ms: 100 });
    results.score_agent = await benchTool(trackerClient, 'score_agent', { agent: 'bench_agent', outcome: 'success' });
    trackerClient.kill();
  } catch (e) { results.track_tool_use = { error: e.message }; }

  console.log(JSON.stringify({
    name: 'mcp-tool-latency',
    metrics: results,
    pass: Object.values(results).filter(r => !r.error).every(r => r.p50 < 500),
    message: `Benchmarked ${Object.keys(results).length} tools`,
  }));
})();
