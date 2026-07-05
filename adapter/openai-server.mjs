// OpenAI-compatible API server for Brain Engine v2
// Exposes /v1/chat/completions for any OpenAI client
// Usage: node adapter/openai-server.mjs [port]
//   AI Clinic: ai-clinic check brain-engine --base-url http://localhost:3458/v1 --plan all
//   OpenCode:  add model "brain-engine" with baseUrl "http://localhost:3458/v1"

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || '3458', 10);

// Load API key
let apiKey = process.env.DEEPSEEK_API_KEY || '';
try {
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const m = env.match(/DEEPSEEK_API_KEY=(.+)/);
  if (m) apiKey = m[1];
} catch {}
if (!apiKey) { console.error('Missing DEEPSEEK_API_KEY'); process.exit(1); }

// Dynamic import BrainEngine
const { BrainEngine } = await import('../brain-engine/src/core/brain-engine.js');
const engine = new BrainEngine({
  apiKey,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
});

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

  const path = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (path === '/health' || path === '/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', model: 'brain-engine', version: '2.0.0' }));
    return;
  }

  if (path === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'brain-engine', object: 'model', created: Date.now(), owned_by: 'brain-agent' }] }));
    return;
  }

  if (path === '/v1/chat/completions' && req.method === 'POST') {
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
  console.log(`\n   Test: curl http://localhost:${PORT}/v1/chat/completions -d '{"model":"brain-engine","messages":[{"role":"user","content":"Hello"}]}'`);
  console.log(`   AI Clinic: ai-clinic check brain-engine --base-url http://localhost:${PORT}/v1`);
  console.log(`   OpenCode: add model "brain-engine" with baseUrl "http://localhost:${PORT}/v1"\n`);
});
