// concurrency-mixed.test.js — Spawn reward + tracker MCPs. 5 score_action + 5 track_tool_use in parallel. No interference.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = path.resolve(__dirname, '..', '..');

function connectMcp(serverPath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(BRAIN_DIR, serverPath);
    if (!fs.existsSync(fullPath)) return reject(new Error(`Server not found: ${fullPath}`));
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
        const timeout = setTimeout(() => { resolvers.delete(id); reject2(new Error(`Timeout: ${method}`)); }, 10000);
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
  name: 'MCP: Mixed Reward+Tracker Concurrency',
  run: async () => {
    const start = Date.now();
    const results = [];
    let rewardClient;
    let trackerClient;

    try {
      rewardClient = await connectMcp('src/mcp/reward-system/dist/server.js');
      trackerClient = await connectMcp('src/mcp/tool-tracker/dist/server.js');

      const rewardPromises = [];
      for (let i = 0; i < 5; i++) {
        rewardPromises.push(rewardClient.send('tools/call', {
          name: 'score_action',
          arguments: { action_type: 'read', target: `/test/file${i}.js`, context: `concurrency test ${i}`, alpha: 0.7 },
        }));
      }
      const trackerPromises = [];
      for (let i = 0; i < 5; i++) {
        trackerPromises.push(trackerClient.send('tools/call', {
          name: 'track_tool_use',
          arguments: { action_type: 'read', target: `/test/file${i}.js`, success: true, duration_ms: 100 + i * 10 },
        }));
      }

      const allResults = await Promise.all([...rewardPromises, ...trackerPromises]);
      const allOk = allResults.every(r => r && !r.isError);
      results.push({ name: '5 score_action + 5 track_tool_use all succeed', pass: allOk });

      const rewardReport = await rewardClient.send('tools/call', { name: 'reward_report', arguments: {} });
      results.push({ name: 'Reward report accessible after concurrency', pass: rewardReport && !rewardReport.isError });

      const trackerStats = await trackerClient.send('tools/call', {
        name: 'get_tool_stats',
        arguments: { k: 10 },
      });
      results.push({ name: 'Tracker stats accessible after concurrency', pass: trackerStats && !trackerStats.isError });

      rewardClient.kill();
      trackerClient.kill();

    } catch (e) {
      results.push({ name: 'Test error: ' + e.message.slice(0, 100), pass: false });
      if (rewardClient) rewardClient.kill();
      if (trackerClient) trackerClient.kill();
    }

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
