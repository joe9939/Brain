// Session Pool Tests — v2: 会话池单元测试
// 测试会话创建/组件运行/并行执行/输出解析

import { SessionPool } from '../src/core/session-pool';
import { MentalState, BrainComponent } from '../src/core/types';
import { readFileSync } from 'fs';

const env = readFileSync('C:/Users/86189/Desktop/brain-agent/.env', 'utf8');
const match = env.match(/DEEPSEEK_API_KEY=(.+)/);
const API_KEY = match?.[1] || '';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeState(): MentalState {
  return {
    mem: { working: [], episodic: [], semantic: [], procedural: [] },
    wm: { lastScan: 0, changedFiles: [], codebaseDigest: '', predictions: new Map() },
    emo: { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3, dominance: 0.5 },
    goal: { active: [], completed: 0, history: [] },
    rew: { score: 0, total: 0, td_error: 0, history: [] },
  };
}

function testCreatePool() {
  console.log('\n🏊 Create SessionPool');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  const stats = pool.stats();
  assert(stats.total === 0, 'fresh pool has 0 sessions');
}

function testGetOrCreate() {
  console.log('\n🔑 Get Or Create Session');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });

  const s1 = pool.getOrCreate('thalamus');
  assert(s1.id === 'br-thalamus', 'session id format');
  assert(s1.componentId === 'thalamus', 'component id stored');
  assert(Array.isArray(s1.history), 'history initialized');

  // Same component returns existing session
  const s2 = pool.getOrCreate('thalamus');
  assert(s2.id === s1.id, 'same component returns same session');
}

async function testRunComponent() {
  console.log('\n🏃 Run Component');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  const state = makeState();

  const component: BrainComponent = {
    id: 'world-cortex',
    label: 'World Cortex',
    sessionId: 'br-world-cortex',
    prompt: 'You are a coding assistant. Answer briefly.',
    async run() { return { componentId: 'world-cortex', summary: '', signals: {}, state: {} }; },
  };

  // This will actually call DeepSeek API
  const result = await pool.runComponent(component, 'What is 2+2?', state);
  assert(result.componentId === 'world-cortex', 'component id preserved');
  assert(typeof result.summary === 'string', 'has summary text');
  assert(result.summary.length > 0, 'summary is non-empty');
}

async function testRunAllParallel() {
  console.log('\n⚡ Run All Components in Parallel');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  const state = makeState();

  const components: BrainComponent[] = [
    {
      id: 'comp-a', label: 'Comp A', sessionId: 'br-a',
      prompt: 'You are a coding assistant. Answer in one sentence.',
      async run() { return { componentId: 'comp-a', summary: '', signals: {}, state: {} }; },
    },
    {
      id: 'comp-b', label: 'Comp B', sessionId: 'br-b',
      prompt: 'You are a coding assistant. Answer in one sentence.',
      async run() { return { componentId: 'comp-b', summary: '', signals: {}, state: {} }; },
    },
  ];

  const results = await pool.runAll(components, 'What is the capital of France?', state);
  assert(results.size >= 2, 'both components return results');

  const rA = results.get('comp-a');
  assert(rA !== undefined, 'comp-a result exists');
  assert(typeof rA!.summary === 'string', 'comp-a summary is string');
}

function testClearSession() {
  console.log('\n🧹 Clear Session');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });

  pool.getOrCreate('thalamus');
  assert(pool.stats().total === 1, 'session created');

  pool.clear('thalamus');
  assert(pool.stats().total === 0, 'session cleared');
}

async function testParseOutput() {
  console.log('\n📝 Parse Output');
  // Testing the private parseOutput through runComponent
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  const state = makeState();

  const component: BrainComponent = {
    id: 'parser-test',
    label: 'Parser Test',
    sessionId: 'br-parser',
    prompt: 'You are a coding assistant. Answer briefly.',
    async run() { return { componentId: 'parser-test', summary: '', signals: {}, state: {} }; },
  };

  const result = await pool.runComponent(component, 'hello world', state);
  assert(result.componentId === 'parser-test', 'component id correct');
  assert(result.signals !== undefined, 'signals object created');
  assert(typeof result.summary === 'string', 'summary is string');
}

function testStats() {
  console.log('\n📊 Pool Stats');
  const pool = new SessionPool({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });

  pool.getOrCreate('a');
  pool.getOrCreate('b');
  pool.getOrCreate('c');
  assert(pool.stats().total === 3, '3 sessions tracked');
}

// ─── RUN ───
async function main() {
  console.log('🧠 SESSION POOL UNIT TESTS');
  console.log('='.repeat(50));

  if (!API_KEY) {
    console.log('⚠️  No API key found — pool tests require API calls, skipping component execution tests');
    testCreatePool();
    testGetOrCreate();
    testClearSession();
    testStats();
  } else {
    testCreatePool();
    testGetOrCreate();
    await testRunComponent();
    await testRunAllParallel();
    testClearSession();
    await testParseOutput();
    testStats();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Session Pool: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) process.exit(1);
  else console.log('All session pool tests passed! ✅');
}

await main();
