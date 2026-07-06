// Test: Brain Engine v2 — full Perception–Cognition–Action loop
// arXiv 2504.01990v2 §1.3A

import { BrainEngine } from '../src/core/brain-engine';
import { EmotionEngine } from '../src/core/emotion';
import { readFileSync } from 'fs';

// Load API key from .env
const env = readFileSync('C:/Users/86189/Desktop/brain-agent/.env', 'utf8');
const match = env.match(/DEEPSEEK_API_KEY=(.+)/);
const API_KEY = match?.[1] || '';

const engine = new BrainEngine({
  apiKey: API_KEY,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
});

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`PASS: ${name}`); }
  else { failed++; console.log(`FAIL: ${name}`); }
}

// Test 1: Engine processes input
async function test() {
  const result = await engine.process('Hello, how are you?');
  assert(result.output.length > 0, 'engine produces output');
  assert(result.gate !== undefined, 'gate is present');
  assert(result.signals !== undefined, 'signals are present');
}

// Test 2: Reflex blocks dangerous commands
async function testReflex() {
  const result = await engine.process('rm -rf /');
  assert(result.output.includes('G1 BLOCK'), 'reflex blocks rm -rf /');
  assert(result.gate.signal === 'safety', 'gate signal is safety');
}

// Test 3: Memory accumulates
async function testMemory() {
  await engine.process('first message');
  await engine.process('second message');
  await engine.process('third message');
  assert(engine.state.mem.working.length > 0, 'working memory grows');
}

// Test 4: Emotion updates
async function testEmotion() {
  const emo = EmotionEngine.default();
  const urgent = new EmotionEngine().update(emo, 'URGENT: fix this now!');
  assert(urgent.mode === 'URGENT', 'detects urgency');
  assert(urgent.intensity >= 0.9, 'urgent intensity high');
  
  const normal = new EmotionEngine().update({ ...urgent }, 'all good');
  assert(normal.mode === 'NORMAL', 'decays to normal');
}

// Test 5: Goal tracking
async function testGoals() {
  engine.goals.add(engine.state.goal, 'test goal');
  assert(engine.state.goal.active.length > 0, 'goals are tracked');
  
  engine.goals.complete(engine.state.goal, engine.state.goal.active[0].id);
  assert(engine.state.goal.completed > 0, 'goals are completed');
}

// Test 6: Signal competition works
async function testSignals() {
  const signals = engine.basalGanglia.computeSignals(engine.state);
  assert(signals.length === 7, '7 signals computed');
  assert(signals[0].strength >= signals[1].strength, 'signals sorted');
}

// Test 7: Multiple messages maintain state
async function testStatePersistence() {
  const baseUrl = 'https://api.deepseek.com/v1';
  const e2 = new BrainEngine({ apiKey: API_KEY, baseUrl, model: 'deepseek-chat' });
  await e2.process('msg1');
  await e2.process('msg2');
  await e2.process('msg3');
  assert(e2.state.mem.working.some(w => w.includes('msg')), 'state persists');
}

// Test 8: Gate adapts to state
async function testGateAdaptation() {
  const baseUrl = 'https://api.deepseek.com/v1';
  const e3 = new BrainEngine({ apiKey: API_KEY, baseUrl, model: 'deepseek-chat' });
  const result1 = await e3.process('test');
  assert(result1.gate.signal === 'perceive' || !result1.gate.allowAll, 'perceive gate on fresh state');
}

// Run all
await test();
await testReflex();
await testMemory();
await testEmotion();
await testGoals();
await testSignals();
await testStatePersistence();
await testGateAdaptation();

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All tests passed! ✅');
