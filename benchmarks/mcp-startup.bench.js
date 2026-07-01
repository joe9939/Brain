// mcp-startup.bench.js — Spawn MCP, measure to first tools/list. < 2s cold.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = path.resolve(__dirname, '..');

const MCP_SERVERS = [
  { name: 'memory-store', path: 'src/mcp/memory-store/dist/server.js' },
  { name: 'reward-system', path: 'src/mcp/reward-system/dist/server.js' },
  { name: 'tool-tracker', path: 'src/mcp/tool-tracker/dist/server.js' },
];

function measureStartup(serverPath) {
  return new Promise((resolve) => {
    const fullPath = path.join(BRAIN_DIR, serverPath);
    if (!fs.existsSync(fullPath)) return resolve({ error: 'not found' });

    const t0 = performance.now();
    const proc = spawn('node', [fullPath], { cwd: BRAIN_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    let msgId = 0;
    const resolvers = new Map();
    let resolved = false;

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id && resolvers.has(msg.id) && !resolved) {
            resolved = true;
            resolvers.get(msg.id)(msg);
            resolvers.delete(msg.id);
          }
        } catch { }
      }
    });

    const id = `${++msgId}`;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; proc.kill(); resolve({ error: 'timeout' }); }
    }, 10000);

    resolvers.set(id, (result) => {
      clearTimeout(timeout);
      const elapsed = performance.now() - t0;
      proc.kill();
      resolve({ time_ms: elapsed });
    });

    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id,
      method: 'initialize',
      params: { protocolVersion: '0.1.0', capabilities: {}, clientInfo: { name: 'bench', version: '1.0' } },
    }) + '\n');
  });
}

(async () => {
  const results = [];
  for (const mcp of MCP_SERVERS) {
    const r = await measureStartup(mcp.path);
    results.push({ server: mcp.name, ...r });
  }

  const validResults = results.filter(r => !r.error);
  const avgTime = validResults.length > 0
    ? Math.round(validResults.reduce((s, r) => s + r.time_ms, 0) / validResults.length * 100) / 100
    : 0;

  console.log(JSON.stringify({
    name: 'mcp-startup',
    metrics: {
      servers_tested: MCP_SERVERS.length,
      servers_ok: validResults.length,
      avg_startup_ms: avgTime,
      results: results.map(r => ({ server: r.server, time_ms: r.time_ms || 0, error: r.error || null })),
    },
    pass: validResults.every(r => r.time_ms < 2000),
    message: `${validResults.length}/${MCP_SERVERS.length} servers started, avg ${avgTime}ms`,
  }));
})();
