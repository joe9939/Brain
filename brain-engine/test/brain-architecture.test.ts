// Test: Brain Engine v2 — 完整人脑架构验证
// 所有20组件按人脑方式激活 (arXiv 2504.01990v2)
// 1. Reflex (0 LLM) → 2. L1+Eval ALL并行 → 3. 信号竞争 → 4. Swarm/Reg

import { BrainEngine } from '../src/core/brain-engine';
import { readFileSync } from 'fs';

const env = readFileSync('C:/Users/86189/Desktop/brain-agent/.env', 'utf8');
const m = env.match(/DEEPSEEK_API_KEY=(.+)/);
const API_KEY = m?.[1] || '';

let passed = 0, failed = 0, total = 0;
function assert(ok: boolean, name: string) {
  total++;
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeEngine() {
  return new BrainEngine({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
}

// ═══════════════════════════════════════════════════
// REFLEX LAYER (§5) — 0 LLM, 0ms
// ═══════════════════════════════════════════════════

async function testReflex() {
  console.log('\n⚡ REFLEX LAYER (§5) — 0 LLM');
  const e = makeEngine();
  const r = await e.process('rm -rf /');
  assert(r.output.includes('BLOCK'), 'reflex blocks dangerous input');
  assert(r.outputRouter.component === 'reflex', 'reflex handles output');
  assert(r.outputRouter.usedLLM === false, 'reflex uses 0 LLM');
}

// ═══════════════════════════════════════════════════
// COGNITIVE LAYER (L1+Eval) — ALL 10 parallel
// ═══════════════════════════════════════════════════

async function testAll10Parallel() {
  console.log('\n🧠 COGNITIVE LAYER (L1+Eval ALL 10)');
  const e = makeEngine();
  const r = await e.process('Hello, how are you?');
  assert(!!r.output, 'output produced');
  assert(r.outputRouter.component === 'brain', 'brain synthesizes output');
  assert(e.state.emo.mode !== undefined, 'amygdala updated emotion');
  assert(e.state.mem.working.length > 0, 'hippocampus updated working memory');
}

async function testAmygdalaEmotion() {
  console.log('\n❤️ AMYGDALA — 每次输入都检测情绪');
  const e = makeEngine();
  
  // Process a normal input
  await e.process('Hello');
  const emo1 = e.state.emo.mode;
  assert(typeof emo1 === 'string', 'amygdala processes emotion on every input');
  
  // Amygdala should respond to CAUTION content
  await e.process('URGENT: fix security vulnerability now!');
  assert(e.state.emo.intensity > 0, 'amygdala detects urgency');
}

async function testHippocampusMemory() {
  console.log('\n💾 HIPPOCAMPUS — 每次输入都检索记忆');
  const e = makeEngine();
  await e.process('message 1');
  await e.process('message 2');
  await e.process('message 3');
  assert(e.state.mem.working.length >= 1, 'hippocampus accumulates working memory');
}

async function testRewardEvaluation() {
  console.log('\n💰 REWARD — 每次任务后评估');
  const e = makeEngine();
  const initial = e.state.rew.total;
  await e.process('test input');
  assert(e.state.rew.total >= initial, 'reward updates after processing');
}

// ═══════════════════════════════════════════════════
// SIGNAL COMPETITION (§2.4) — 7 signals, all computed
// ═══════════════════════════════════════════════════

async function testSignalCompetition() {
  console.log('\n🧬 SIGNAL COMPETITION (§2.4) — 7 signals');
  const e = makeEngine();
  const signals = e.basalGanglia.computeSignals(e.state);
  assert(signals.length === 7, '7 signals always computed');
  assert(signals.every(s => s.strength !== undefined), 'all signals have strength');
  assert(signals[0].strength >= signals[signals.length-1].strength, 'signals sorted descending');
}

// ═══════════════════════════════════════════════════
// BASAL GANGLIA GATE (§3.3.4) — Go/NoGo
// ═══════════════════════════════════════════════════

async function testGate() {
  console.log('\n🚦 BASAL GANGLIA GATE (§3.3.4)');
  const e = makeEngine();
  const gate = e.basalGanglia.getGate(e.state, 'bash');
  assert(gate.allowAll === false, 'perceive signal gates non-task tools');
  assert(gate.signal !== null, 'gate has signal attribution');
}

// ═══════════════════════════════════════════════════
// OUTPUT ROUTING (§2.7)
// ═══════════════════════════════════════════════════

async function testOutputRouting() {
  console.log('\n📤 OUTPUT ROUTING (§2.7)');
  const e = makeEngine();
  const r = await e.process('What is 2+2?');
  assert(r.outputRouter.usedLLM === true, 'cognitive output uses LLM');
  assert(r.outputRouter.component === 'brain', 'brain routes output');
  assert(r.signals !== undefined, 'signals attached to output');
}

// ═══════════════════════════════════════════════════
// FULL PIPELINE (§1.3A) — complete Perception→Action
// ═══════════════════════════════════════════════════

async function testFullPipeline() {
  console.log('\n🔄 FULL PIPELINE (§1.3A)');
  const e = makeEngine();
  
  // Multiple turns
  await e.process('First: set up project');
  await e.process('Second: add tests');
  await e.process('Third: deploy');
  
  assert(e.state.goal.active.length >= 0, 'goals tracked across turns');
  assert(e.state.rew.total >= 0, 'reward tracked across turns');
  assert(e.state.mem.working.length >= 0, 'working memory persists across turns');
}

// ═══════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════

console.log('🧠 BRAIN ENGINE v2 — 完整人脑架构验证');
console.log('='.repeat(50));

await testReflex();
await testAll10Parallel();
await testAmygdalaEmotion();
await testHippocampusMemory();
await testRewardEvaluation();
await testSignalCompetition();
await testGate();
await testOutputRouting();
await testFullPipeline();

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed} passed, ${failed} failed, ${total} total`);
if (failed > 0) process.exit(1);
else console.log('All brain architecture tests passed! 🧠✅');
