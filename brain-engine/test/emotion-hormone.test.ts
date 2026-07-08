// Emotion Hormone Tests — 激素影响情绪衰减速率
// RED: EmotionEngine.update 不支持激素调制

import { EmotionEngine } from '../src/core/emotion';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testNormalDecay() {
  console.log('\n📉 Normal Decay — without hormone influence');
  const e = new EmotionEngine();
  let state = { mode: 'URGENT' as const, intensity: 0.9, valence: -0.5, arousal: 0.9, dominance: 0.5 };
  
  state = e.update(state, 'hello');
  assert(state.intensity < 0.9, 'intensity decays normally');
  assert(state.intensity > 0.7, 'intensity still > 0.7 after 1 decay');
}

function testAdrenalineSlowsDecay() {
  console.log('\n🐌 Adrenaline Slows Decay — high adrenaline → intensity drops slower');
  const e = new EmotionEngine();
  
  let state = { mode: 'URGENT' as const, intensity: 0.9, valence: -0.5, arousal: 0.9, dominance: 0.5 };
  state = e.update(state, 'hello', { adrenaline: 1.0, cortisol: 0, endorphin: 0 });
  
  // With adrenaline 1.0, decay should be slower than normal
  assert(state.intensity > 0.8, 'adrenaline slows intensity decay');
}

function testCortisolSlowsDecay() {
  console.log('\n😰 Cortisol Slows Decay — high cortisol → arousal stays elevated');
  const e = new EmotionEngine();
  
  let state = { mode: 'CAUTION' as const, intensity: 0.8, valence: -0.3, arousal: 0.7, dominance: 0.4 };
  state = e.update(state, 'checking', { adrenaline: 0, cortisol: 1.0, endorphin: 0 });
  
  assert(state.arousal > 0.6, 'cortisol slows arousal decay');
}

function testEndorphinAcceleratesDecay() {
  console.log('\n😊 Endorphin Accelerates Decay — high endorphin → calm down faster');
  const e = new EmotionEngine();
  
  let state = { mode: 'URGENT' as const, intensity: 0.9, valence: -0.5, arousal: 0.9, dominance: 0.5 };
  state = e.update(state, 'hello', { adrenaline: 0, cortisol: 0, endorphin: 1.0 });
  
  assert(state.intensity < 0.7, 'endorphin accelerates intensity decay');
}

function testNoHormoneFallback() {
  console.log('\n🔄 No Hormone — normal decay (backward compatible)');
  const e = new EmotionEngine();
  let state = { mode: 'URGENT' as const, intensity: 0.9, valence: -0.5, arousal: 0.9, dominance: 0.5 };
  
  // Call update without hormone argument
  state = e.update(state, 'hello');
  assert(state.intensity < 0.9, 'still decays without hormone');
}

// ─── RUN ───
console.log('🧠 EMOTION HORMONE TESTS');
console.log('='.repeat(50));

testNormalDecay();
testAdrenalineSlowsDecay();
testCortisolSlowsDecay();
testEndorphinAcceleratesDecay();
testNoHormoneFallback();

console.log(`\n${'='.repeat(50)}`);
console.log(`EmotionHormone: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All emotion hormone tests passed! ✅');
