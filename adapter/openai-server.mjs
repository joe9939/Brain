// OpenAI-compatible API server for Brain Engine v2
// Exposes /v1/chat/completions for any OpenAI client
// Usage: node adapter/openai-server.mjs [port]
//   Playground: http://localhost:3458/
//   AI Clinic: ai-clinic check brain-engine --base-url http://localhost:3458/v1 --plan all
//   OpenCode:  add model "brain-engine" with baseUrl "http://localhost:3458/v1"

import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { networkInterfaces } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || process.env.PORT || '3458', 10);

// ── Load .env ──
function loadEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(new RegExp(`${key}=(.+)`));
    if (m) return m[1];
  } catch {}
  return '';
}

// ── Brain API key (for clients to authenticate to this server) ──
let BRAIN_API_KEY = loadEnv('BRAIN_API_KEY');
if (!BRAIN_API_KEY) {
  BRAIN_API_KEY = 'brain-' + randomBytes(16).toString('hex');
  console.log(`\n🔑 BRAIN_API_KEY not set — generated temporary key:`);
  console.log(`   ${BRAIN_API_KEY}`);
  console.log(`   Set BRAIN_API_KEY in .env to use a fixed key.\n`);
}

// ── DeepSeek API key (for Brain Engine's underlying LLM) ──
let DEEPSEEK_KEY = loadEnv('DEEPSEEK_API_KEY');
if (!DEEPSEEK_KEY) { console.error('❌ Missing DEEPSEEK_API_KEY in .env'); process.exit(1); }

// Dynamic import BrainEngine (from TypeScript source via tsx)
// tsx handles extensionless ESM imports that Node.js cannot resolve
const { BrainEngine } = await import('../brain-engine/src/index.ts');
const engine = new BrainEngine({
  apiKey: DEEPSEEK_KEY,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
});

// ─── Auth check ───
function authenticate(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== BRAIN_API_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Invalid API key', type: 'auth_error' } }));
    return false;
  }
  return true;
}

// ─── Handler ───
async function handleChat(body) {
  const msg = (body.messages || []).filter(m => m.role === 'user').pop()?.content || '';
  const result = await engine.process(msg);
  return {
    id: `brain-${Date.now()}`, object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'brain-engine',
    choices: [{ index: 0, message: { role: 'assistant', content: result.output }, finish_reason: 'stop' }],
    usage: { prompt_tokens: msg.length, completion_tokens: result.output.length, total_tokens: msg.length + result.output.length },
    brain_meta: { signal: result.outputRouter?.signal, component: result.outputRouter?.component, latency_ms: result.outputRouter?.latency },
  };
}

// ─── Server ───
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Health
  if (path === '/health' || path === '/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', model: 'brain-engine', version: '2.0.0' }));
    return;
  }

  // Models list
  if (path === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'brain-engine', object: 'model', created: Date.now(), owned_by: 'brain-agent' }] }));
    return;
  }

  // Playground Web UI
  if (path === '/' || path === '/playground' || path === '/index.html') {
    const pgPath = join(__dirname, '..', 'visualizer', 'playground.html');
    if (existsSync(pgPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(pgPath, 'utf8'));
      return;
    }
    res.writeHead(404); res.end('Playground not found');
    return;
  }

  // Chat completions (non-streaming only, auth required)
  if (path === '/v1/chat/completions' && req.method === 'POST') {
    if (!authenticate(req, res)) return;
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const result = await handleChat(JSON.parse(body));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: e.message, type: 'brain_error' } }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = (() => { const n = networkInterfaces(); for (const k of Object.keys(n)) for (const v of n[k]) if (v.family === 'IPv4' && !v.internal) return v.address; return '0.0.0.0'; })();
  console.log(`\n🧠 Brain Engine API (OpenAI-compatible)`);
  console.log(`   http://localhost:${PORT}/v1/chat/completions`);
  console.log(`   Playground: http://localhost:${PORT}/`);
  console.log(`\n   Test: curl http://localhost:${PORT}/v1/chat/completions -H "Authorization: Bearer ${BRAIN_API_KEY}" -d '{"model":"brain-engine","messages":[{"role":"user","content":"Hello"}]}'`);
  console.log(`   AI Clinic: ai-clinic check brain-engine --base-url http://localhost:${PORT}/v1 --api-key ${BRAIN_API_KEY}`);
  console.log(`   OpenCode: add model "brain-engine" with apiKey "${BRAIN_API_KEY}" baseUrl "http://localhost:${PORT}/v1"\n`);
});
