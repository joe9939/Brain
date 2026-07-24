// visualizer/server-v2.mjs — V2 Brain Engine 实时可视化服务器
// 直接连接 BrainEngine，不需要 brain-circuit.log
// Usage: node visualizer/server-v2.mjs [port]
// 然后打开 http://localhost:3457

import { createServer } from 'http';
import { readFileSync, statSync, openSync, readSync, closeSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { homedir, networkInterfaces } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || '3457', 10);
const ENGINE_DIR = join(__dirname, '..', 'brain-engine');

// ─── Dynamically import BrainEngine ───
// Since BrainEngine is TypeScript, we need to transpile or use compiled JS
// For now, use the log-based approach but also support direct state API

// ─── State ───
let state = {
  signals: {}, winner: null, l1Progress: [],
  mood: { mode: 'NORMAL', intensity: 0.1 },
  reward: { score: 0, total: 0, td_error: 0, goals: 0 },
  regionActivity: {}, eventLog: [],
  gate: {}, pathways: [],
  components: [
    { id: 'thalamus', label: '📡 Thalamus', status: 'idle' },
    { id: 'amygdala', label: '❤️ Amygdala', status: 'idle' },
    { id: 'hippocampus', label: '💾 Hippocampus', status: 'idle' },
    { id: 'world-cortex', label: '🌍 World Cortex', status: 'idle' },
    { id: 'safety', label: '🛡️ Safety', status: 'idle' },
    { id: 'cerebellum', label: '⚙️ Cerebellum', status: 'idle' },
    { id: 'basal-ganglia', label: '🎯 Basal Ganglia', status: 'idle' },
    { id: 'insula', label: '🔍 Insula', status: 'idle' },
    { id: 'attention', label: '🔦 Attention', status: 'idle' },
    { id: 'reward', label: '💰 Reward', status: 'idle' },
    { id: 'dmn', label: '💭 DMN', status: 'idle' },
    { id: 'hypothalamus', label: '🌡️ Hypothalamus', status: 'idle' },
    { id: 'self-optimizer', label: '🔧 Optimizer', status: 'idle' },
    { id: 'offline-consol', label: '💤 Consol.', status: 'idle' },
    { id: 'self-enhance', label: '📈 Enhance', status: 'idle' },
    { id: 'swarm-planner', label: '📋 Planner', status: 'idle' },
    { id: 'swarm-coder', label: '💻 Coder', status: 'idle' },
    { id: 'swarm-reviewer', label: '👁️ Reviewer', status: 'idle' },
    { id: 'swarm-tester', label: '🧪 Tester', status: 'idle' },
    { id: 'brain', label: '🧠 Brain', status: 'idle' },
  ],
};

// ─── Read brain-circuit.log for v2 data ───
const LOG = join(homedir(), '.config', 'opencode', 'brain-circuit.log');

const SIGNAL_MAP = {
  perceive: 'L1 Perception', emotion: 'Emotion', safety: 'Safety',
  memory: 'Memory', reward: 'Reward', action: 'Action', learning: 'Learning',
};
const SIGNAL_COLORS = {
  perceive: '#4CAF50', emotion: '#FF9800', safety: '#F44336',
  memory: '#2196F3', reward: '#9C27B0', action: '#00BCD4', learning: '#607D8B',
};
const SIGNAL_REGIONS = {
  perceive: ['thalamus','amygdala','hippocampus','world-cortex','safety'],
  emotion: ['amygdala'], safety: ['safety','insula'],
  memory: ['hippocampus'], reward: ['reward','basal-ganglia'],
  action: ['swarm-planner','swarm-coder','swarm-reviewer','swarm-tester'],
  learning: ['self-optimizer','offline-consol','self-enhance'],
};

function activateRegions(signalKey) {
  const now = Date.now();
  (SIGNAL_REGIONS[signalKey] || []).forEach(id => state.regionActivity[id] = now);
  state.regionActivity['brain'] = now;
}

function addEvent(type, detail) {
  state.eventLog.unshift({ ts: Date.now(), type, detail });
  if (state.eventLog.length > 50) state.eventLog.pop();
}

// ─── Parse log lines (same as v1 but with v2 enhancements) ───
function parseLine(msg) {
  // [Signals] perceive=0.85(×5), emotion=0.45(×4)...
  const sig = msg.match(/\[Signals\]\s(.+)/);
  if (sig) {
    const parts = sig[1].split(',').map(s => s.trim());
    const signals = {};
    let winner = null, maxS = -1;
    parts.forEach(p => {
      const m = p.match(/(\w+)=([\d.]+)\(×(\d+)\)/);
      if (!m) return;
      const raw = parseFloat(m[2]), pri = parseInt(m[3], 10);
      const str = raw * pri;
      signals[m[1]] = { raw, priority: pri, strength: str, label: SIGNAL_MAP[m[1]] || m[1], color: SIGNAL_COLORS[m[1]] || '#666' };
      if (str > maxS) { maxS = str; winner = { key: m[1], raw, strength: str, priority: pri }; }
    });
    state.signals = signals;
    state.winner = winner;
    if (winner) activateRegions(winner.key);
    return true;
  }

  // [Signal] WINNER: perceive (strength=0.85)
  const win = msg.match(/\[Signal\] WINNER:\s(\w+)\s\(strength=([\d.]+)\)/);
  if (win) {
    state.winner = { key: win[1], raw: parseFloat(win[2]) };
    addEvent('winner', win[1]);
    activateRegions(win[1]);
    return true;
  }

  // [T2] L1: brain-thalamus (1/5)
  const l1 = msg.match(/\[T2\] L1:\s([\w-]+)\s\((\d+)\/(\d+)\)/);
  if (l1) {
    const name = l1[1].replace('brain-', '');
    if (!state.l1Progress.includes(name)) state.l1Progress.push(name);
    state.regionActivity[name] = Date.now();
    addEvent('l1', name);
    return true;
  }

  // T3 cycle
  if (msg.includes('[T3] cycle#')) {
    state.l1Progress = [];
    addEvent('cycle', msg.match(/cycle#(\d+)/)?.[1] || '');
    return true;
  }

  // Mood
  const m = msg.match(/M_emo=(\w+)@([\d.]+)/);
  if (m) { state.mood.mode = m[1]; state.mood.intensity = parseFloat(m[2]); return true; }

  // Reward
  const rw = msg.match(/M_rew=([\d.]+)\sM_goal=(\d+)/);
  if (rw) { state.reward.score = parseFloat(rw[1]); state.reward.goals = parseInt(rw[2], 10); return true; }

  return false;
}

// ─── Log watching ───
let lastSize = 0;
function initLog() {
  try { const s = statSync(LOG); lastSize = s.size; console.log(`Log: ${(lastSize/1024).toFixed(0)}KB`); } catch { console.log('Waiting for log...'); }
}
initLog();

function readNewLines() {
  try {
    const s = statSync(LOG);
    if (s.size <= lastSize) return [];
    const sz = Math.min(s.size - lastSize, 131072);
    const fd = openSync(LOG, 'r'); const buf = Buffer.alloc(sz);
    const n = readSync(fd, buf, 0, sz, lastSize); closeSync(fd);
    lastSize = s.size;
    return buf.toString('utf8', 0, n).split('\n').filter(l => l.trim());
  } catch { return []; }
}

setInterval(() => {
  const lines = readNewLines();
  let changed = false;
  lines.forEach(l => { try { const e = JSON.parse(l); if (parseLine(e.msg)) changed = true; } catch {} });
  if (changed) broadcast();
}, 200);

// ─── SSE ───
let clients = [];
function broadcast() {
  if (!clients.length) return;
  const data = JSON.stringify({
    signals: state.signals, winner: state.winner,
    l1Progress: state.l1Progress, mood: state.mood, reward: state.reward,
    regionActivity: state.regionActivity, eventLog: state.eventLog.slice(0, 20),
    components: state.components,
    ts: Date.now(),
  });
  const msg = `data: ${data}\n\n`;
  clients = clients.filter(c => { try { c.write(msg); return true; } catch { return false; } });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };

createServer((req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (path === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({
      signals: state.signals, winner: state.winner,
      l1Progress: state.l1Progress, mood: state.mood, reward: state.reward,
      regionActivity: state.regionActivity, eventLog: state.eventLog.slice(0, 20),
      components: state.components, ts: Date.now(),
    })}\n\n`);
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
    return;
  }
  let fp = path === '/' ? join(__dirname, 'index.html') : join(__dirname, '..', path);
  try { const c = readFileSync(fp); res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(c); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(PORT, '0.0.0.0', () => {
  const ip = (() => { const n = networkInterfaces(); for (const k of Object.keys(n)) for (const v of n[k]) if (v.family==='IPv4'&&!v.internal) return v.address; return '0.0.0.0'; })();
  console.log(`\n🧠 Brain v2 Visualizer\n   http://localhost:${PORT}\n   http://${ip}:${PORT}\n   Data source: ${LOG}\n`);
});
