// Emotion Engine Tests — §2.5: 情感引擎单元测试
// 测试 4 种情绪模式的检测与衰减机制

import { EmotionEngine } from '../src/core/emotion';
import { EmotionState } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testEmotionDefault() {
  console.log('\n📋 Default State');
  const d = EmotionEngine.default();
  assert(d.mode === 'NORMAL', 'default mode is NORMAL');
  assert(d.intensity === 0.1, 'default intensity is 0.1');
  assert(d.valence === 0.1, 'default valence is 0.1');
  assert(d.arousal === 0.3, 'default arousal is 0.3');
  assert(d.dominance === 0.5, 'default dominance is 0.5');
}

function testUrgencyDetection() {
  console.log('\n🚨 Urgency Detection');
  const e = new EmotionEngine();
  const state = EmotionEngine.default();

  // urgent keywords
  const r1 = e.update(state, 'URGENT: fix this now!');
  assert(r1.mode === 'URGENT', 'URGENT keyword triggers urgent mode');
  assert(r1.intensity === 0.9, 'urgent intensity is 0.9');

  // 中文紧急
  const r2 = e.update(state, '紧急情况，请立刻处理');
  assert(r2.mode === 'URGENT', '中文"紧急" triggers urgent mode');

  // asap
  const r3 = e.update(state, 'Please respond ASAP immediately');
  assert(r3.mode === 'URGENT', 'ASAP triggers urgent mode');
}

function testCautionDetection() {
  console.log('\n⚠️ Caution Detection');
  const e = new EmotionEngine();
  const state = EmotionEngine.default();

  const r1 = e.update(state, 'DANGER: Security breach detected');
  assert(r1.mode === 'CAUTION', 'DANGER triggers caution mode');
  assert(r1.intensity === 0.8, 'caution intensity is 0.8');
  assert(r1.valence === -0.3, 'caution valence is negative');

  // rm -rf
  const r2 = e.update(state, 'Run rm -rf / on the server');
  assert(r2.mode === 'CAUTION', 'rm -rf triggers caution');
}

function testSupportDetection() {
  console.log('\n🤝 Support Detection');
  const e = new EmotionEngine();
  const state = EmotionEngine.default();

  const r1 = e.update(state, 'Can you help me fix this?');
  assert(r1.mode === 'SUPPORT', 'help triggers support mode');
  assert(r1.intensity === 0.6, 'support intensity is 0.6');
  assert(r1.valence === 0.7, 'support valence is positive');

  // 中文帮助
  const r2 = e.update(state, '请帮助我，系统坏了');
  assert(r2.mode === 'SUPPORT', '中文"帮助" triggers support');
}

function testDecayToNormal() {
  console.log('\n📉 Decay to Normal');
  const e = new EmotionEngine();

  // Start with high urgency
  let state = e.update(EmotionEngine.default(), 'URGENT: emergency!');
  assert(state.mode === 'URGENT', 'first: urgent');

  // Neutral input → decay
  state = e.update(state, 'Hello, how are you?');
  assert(state.mode === 'NORMAL', 'neutral input decays to NORMAL');
  assert(state.intensity < 0.9, 'intensity decayed from 0.9');
  assert(state.valence !== 0, 'valence still changing');

  // Multiple decays: 0.81 → 0.729 → 0.656 → ...
  state = e.update(state, 'Nice weather today');
  state = e.update(state, 'Another neutral message');
  state = e.update(state, 'Yet another normal input');
  assert(state.intensity < 0.6, 'intensity continues decaying after multiple steps');
}

function testPriorityOrder() {
  console.log('\n🔢 Priority Order');
  const e = new EmotionEngine();
  const state = EmotionEngine.default();

  // Code checks caution FIRST before urgency → safety takes priority
  const r1 = e.update(state, 'URGENT: dangerous security breach!');
  assert(r1.mode === 'CAUTION', 'caution has priority over urgency (safety first)');
}

function testMoodColor() {
  console.log('\n🎨 Mood Colors');
  assert(EmotionEngine.moodColor('NORMAL') === '#4CAF50', 'NORMAL → green');
  assert(EmotionEngine.moodColor('CAUTION') === '#FF9800', 'CAUTION → orange');
  assert(EmotionEngine.moodColor('URGENT') === '#F44336', 'URGENT → red');
  assert(EmotionEngine.moodColor('EXPLORE') === '#2196F3', 'EXPLORE → blue');
  assert(EmotionEngine.moodColor('SUPPORT') === '#00BCD4', 'SUPPORT → cyan');
  assert(EmotionEngine.moodColor('UNKNOWN') === '#4CAF50', 'unknown → default green');
}

// ─── RUN ───
console.log('🧠 EMOTION ENGINE UNIT TESTS');
console.log('='.repeat(50));

testEmotionDefault();
testUrgencyDetection();
testCautionDetection();
testSupportDetection();
testDecayToNormal();
testPriorityOrder();
testMoodColor();

console.log(`\n${'='.repeat(50)}`);
console.log(`Emotion: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All emotion tests passed! ✅');
