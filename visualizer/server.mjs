// visualizer/server.mjs — Full brain state streaming server
import { createServer } from 'http';
import { readFileSync, statSync, openSync, readSync, closeSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { homedir, networkInterfaces } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || '3456', 10);
const LOG = join(homedir(), '.config', 'opencode', 'brain-circuit.log');
const CONFIG = join(homedir(), '.config', 'opencode', 'opencode.json');

// ─── Static data (loaded once) ───
let agentConfigs = {};
let mcpConfigs = {};
let signalFormulas = {};

function loadStaticData() {
  try {
    if (existsSync(CONFIG)) {
      const raw = readFileSync(CONFIG, 'utf8');
      const cfg = JSON.parse(raw);
      // Agent configs
      if (cfg.agent) {
        Object.entries(cfg.agent).forEach(([k, v]) => {
          if (typeof v === 'object' && v.mode) {
            agentConfigs[k] = {
              mode: v.mode,
              model: v.model || 'default',
              description: v.description || '',
              permissions: v.permission ? Object.keys(v.permission) : [],
            };
          }
        });
      }
      // MCP configs
      if (cfg.mcp) {
        Object.entries(cfg.mcp).forEach(([k, v]) => {
          if (typeof v === 'object') {
            mcpConfigs[k] = {
              type: v.type || 'unknown',
              command: Array.isArray(v.command) ? v.command.join(' ') : (v.command || ''),
              enabled: v.enabled !== false,
            };
          }
        });
      }
    }
  } catch {}
  
  signalFormulas = {
    perceive: { label: 'L1 Perception', formula: '1.0 − L1.size × 0.15', priority: 5, color: '#4CAF50' },
    emotion:  { label: 'Emotion', formula: 'CAUTION/URGENT ? 0.9 : intensity × 0.5', priority: 4, color: '#FF9800' },
    safety:   { label: 'Safety Gate', formula: 'CAUTION mode ? 0.9 : 0', priority: 4, color: '#F44336' },
    memory:   { label: 'Memory Retrieval', formula: 'SOP > 0 ? 0.8 : episodic > 0 ? 0.5 : 0', priority: 3, color: '#2196F3' },
    reward:   { label: 'Reward Evaluation', formula: 'score < 3 ? 0.8 : |td_error| > 1 ? 0.6 : 0', priority: 3, color: '#9C27B0' },
    action:   { label: 'Action Execution', formula: 'swarm ? 0.8 : 0', priority: 2, color: '#00BCD4' },
    learning: { label: 'POST Learning', formula: 'goals > 0 && L1 done ? 0.7 : 0', priority: 1, color: '#607D8B' },
  };
}
loadStaticData();

// ─── Dynamic state (from log) ───
let state = {
  signals: {}, signalHistory: [], // keep last 5s of signal snapshots
  winner: null, winnerTimestamp: 0,
  top3: [], lastEvent: null,
  l1Progress: [], cycle: 0,
  mood: { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3 },
  reward: { score: 0, total: 0, td_error: 0, goals: 0 },
  regionActivity: {}, eventLog: [], swarm: false,
  activePathways: [],
  gates: { G1: 'idle', G2: 'idle', G3: 'idle', G4: 'idle', G5: 'idle', G6: 'idle', G7: 'idle' },
};

// ─── Decay old signal entries ───
function decayOldSignals() {
  const now = Date.now();
  // Decay signal strengths: fade to 0 over 5s
  for (const key of Object.keys(state.signals)) {
    const s = state.signals[key];
    if (s.raw > 0) {
      // Signal was recently active - start decay
      s._decayAt = s._decayAt || now;
      const elapsed = (now - s._decayAt) / 1000;
      if (elapsed > 0.1) {
        s.raw = Math.max(0, s.raw - elapsed * 0.3);
        s.strength = s.raw * s.priority;
        if (s.raw <= 0) delete state.signals[key];
      }
    }
  }
  // Decay region activity (5s glow)
  for (const key of Object.keys(state.regionActivity)) {
    const elapsed = (now - state.regionActivity[key]) / 1000;
    if (elapsed > 5) delete state.regionActivity[key];
  }
}

// Run decay every 200ms
setInterval(decayOldSignals, 200);

// ─── Parsers ───
function parseSignalLine(msg) {
  const m = msg.match(/\[Signals\]\s(.+)/);
  if (!m) return null;
  const parts = m[1].split(',').map(s => s.trim());
  const signals = {};
  let winner = null, maxStr = -1;
  for (const part of parts) {
    const match = part.match(/(\w+)=([\d.]+)\(×(\d+)\)/);
    if (!match) continue;
    const [, key, rawStr, priStr] = match;
    const raw = parseFloat(rawStr), priority = parseInt(priStr, 10);
    const strength = raw * priority;
    signals[key] = { raw, priority, strength, formula: signalFormulas[key], label: (signalFormulas[key]||{}).label || key };
    if (strength > maxStr) { maxStr = strength; winner = { key, raw, strength, priority }; }
  }
  return { signals, winner };
}

function parseWinnerLine(msg) {
  const m = msg.match(/\[Signal\] WINNER:\s(\w+)\s\(strength=([\d.]+)\)/);
  return m ? { key: m[1], raw: parseFloat(m[2]) } : null;
}

function parseL1Line(msg) {
  const m = msg.match(/\[T2\] L1:\s([\w-]+)\s\((\d+)\/(\d+)\)/);
  return m ? { agent: m[1], count: parseInt(m[2],10), total: parseInt(m[3],10) } : null;
}

function parseCycleLine(msg) {
  const m = msg.match(/\[T3\]\scycle#(\d+)/);
  return m ? { cycle: parseInt(m[1],10) } : null;
}

function parseMoodLine(msg) {
  const m = msg.match(/M_emo=(\w+)@([\d.]+)\sv=([\d.-]+)\sa=([\d.]+)/);
  if (m) return { mode: m[1], intensity: parseFloat(m[2]), valence: parseFloat(m[3]), arousal: parseFloat(m[4]) };
  const m2 = msg.match(/M_emo=(\w+)@([\d.]+)/);
  return m2 ? { mode: m2[1], intensity: parseFloat(m2[2]) } : null;
}

function parseRewardLine(msg) {
  const m = msg.match(/M_rew=([\d.]+)\sM_goal=(\d+)/);
  return m ? { score: parseFloat(m[1]), goals: parseInt(m[2],10) } : null;
}

function parseTdLine(msg) {
  const m = msg.match(/td_err=([\d.-]+)\stotal=(\d+)/);
  return m ? { td_error: parseFloat(m[1]), total: parseInt(m[2],10) } : null;
}

function parseSwarmLine(msg) {
  if (msg.includes('complex → action signal boosted')) return { swarm: true };
  if (msg.includes('swarm done')) return { swarm: false };
  return null;
}

function parseGateLine(msg) {
  const m = msg.match(/\[T1\]\s(G\d)\s(BLOCK|PASS)/);
  return m ? { gate: m[1], status: m[2].toLowerCase() } : null;
}

const SIGNAL_REGIONS = {
  perceive: ['thalamus','amygdala','hippocampus','world-cortex','safety'],
  emotion: ['amygdala'], safety: ['safety','insula'], memory: ['hippocampus'],
  reward: ['reward','basal-ganglia'], action: ['swarm-planner','swarm-coder','swarm-reviewer','swarm-tester'],
  learning: ['self-optimizer','offline-consol','self-enhance'],
};

function activateRegions(signalKey) {
  const now = Date.now();
  (SIGNAL_REGIONS[signalKey] || []).forEach(id => state.regionActivity[id] = now);
  state.regionActivity['brain'] = now;
}

function addEvent(type, detail) {
  state.eventLog.unshift({ ts: Date.now(), type, detail });
  if (state.eventLog.length > 100) state.eventLog.pop();
}

// ─── Update active pathways ───
function updatePathways() {
  state.activePathways = [];
  const w = state.winner?.key;
  if (state.l1Progress.length > 0 && state.l1Progress.length < 5) state.activePathways.push('perception');
  if (state.mood.mode === 'CAUTION' || state.mood.mode === 'URGENT') state.activePathways.push('emotion');
  if (state.mood.mode === 'CAUTION') state.activePathways.push('safety');
  if (state.signals.memory && state.signals.memory.raw > 0) state.activePathways.push('memory');
  if (state.signals.reward && state.signals.reward.raw > 0) state.activePathways.push('reward');
  if (state.swarm) state.activePathways.push('action');
  if (state.signals.learning && state.signals.learning.raw > 0) state.activePathways.push('learning');
}

function processLines(lines) {
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const { ts, msg } = entry;
      state.lastEvent = { ts, msg };
      let changed = false;

      const sig = parseSignalLine(msg);
      if (sig) {
        // Reset decay timers — fresh signal just arrived
        Object.values(sig.signals).forEach(s => s._decayAt = null);
        state.signals = sig.signals;
        state.winner = sig.winner;
        if (sig.winner) state.winnerTimestamp = Date.now();
        changed = true;
        if (sig.winner) activateRegions(sig.winner.key);
      }

      const win = parseWinnerLine(msg);
      if (win && state.signals[win.key]) {
        state.winner = { key: win.key, raw: win.raw, strength: win.raw * (state.signals[win.key]?.priority||1), priority: state.signals[win.key]?.priority||1 };
        changed = true; activateRegions(win.key);
        addEvent('winner', `${win.key} (${win.raw.toFixed(2)})`);
      }

      const l1 = parseL1Line(msg);
      if (l1) {
        const name = l1.agent.replace('brain-', '');
        if (!state.l1Progress.includes(name)) { state.l1Progress.push(name); state.regionActivity[name] = Date.now(); addEvent('l1', name); }
        changed = true;
      }

      const cyc = parseCycleLine(msg);
      if (cyc) { state.cycle = cyc.cycle; state.l1Progress = []; state.signals = {}; state.winner = null; changed = true; addEvent('cycle', `#${cyc.cycle}`); }

      const md = parseMoodLine(msg);
      if (md) { Object.assign(state.mood, md); changed = true; }

      const rw = parseRewardLine(msg);
      if (rw) { state.reward.score = rw.score; state.reward.goals = rw.goals; changed = true; }

      const td = parseTdLine(msg);
      if (td) { state.reward.td_error = td.td_error; state.reward.total = td.total; changed = true; }

      const sw = parseSwarmLine(msg);
      if (sw !== null) { state.swarm = sw.swarm; changed = true; }

      const gt = parseGateLine(msg);
      if (gt) { state.gates[gt.gate] = gt.status === 'block' ? 'blocked' : 'pass'; changed = true; }

      if (changed) { updatePathways(); broadcast(); }
    } catch {}
  }
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
    const fd = openSync(LOG, 'r');
    const buf = Buffer.alloc(sz);
    const n = readSync(fd, buf, 0, sz, lastSize);
    closeSync(fd);
    lastSize = s.size;
    return buf.toString('utf8', 0, n).split('\n').filter(l => l.trim());
  } catch { return []; }
}

setInterval(() => { const lines = readNewLines(); if (lines.length) processLines(lines); }, 200);

// ─── SSE ───
let clients = [];
function broadcast() {
  if (!clients.length) return;
  const pkg = {
    signals: state.signals, winner: state.winner, top3: state.top3,
    l1Progress: state.l1Progress, cycle: state.cycle, mood: state.mood,
    reward: state.reward, swarm: state.swarm, regionActivity: state.regionActivity,
    lastEvent: state.lastEvent, eventLog: state.eventLog.slice(0, 25),
    activePathways: state.activePathways, gates: state.gates,
    signalFormulas, agentConfigs, ts: Date.now()
  };
  const msg = `data: ${JSON.stringify(pkg)}\n\n`;
  clients = clients.filter(c => { try { c.write(msg); return true; } catch { return false; } });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };

createServer((req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (path === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write(`data: ${JSON.stringify({
      signals: state.signals, winner: state.winner, top3: state.top3,
      l1Progress: state.l1Progress, cycle: state.cycle, mood: state.mood,
      reward: state.reward, swarm: state.swarm, regionActivity: state.regionActivity,
      lastEvent: state.lastEvent, eventLog: state.eventLog.slice(0, 25),
      activePathways: state.activePathways, gates: state.gates,
    signalFormulas, agentConfigs, mcpConfigs, ts: Date.now()
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
  console.log(`🧠 Visualizer\n   http://localhost:${PORT}\n   http://${ip}:${PORT}`);
});
