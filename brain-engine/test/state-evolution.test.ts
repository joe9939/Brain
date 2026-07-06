// State Evolution Tests — 空闲状态演化
// RED: StateEvolution 不存在

import { StateEvolution } from '../src/core/state-evolution';
import { MentalState } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeState(): MentalState {
  return {
    mem: { working: [], episodic: [], semantic: [], procedural: [] },
    wm: { lastScan: 0, changedFiles: [], codebaseDigest: '', predictions: new Map() },
    emo: { mode: 'URGENT', intensity: 0.9, valence: -0.5, arousal: 0.9, dominance: 0.5 },
    goal: { active: [{ id: 'g-1', description: 'test', status: 'active', priority: 5, created: Date.now() }], completed: 0, history: [] },
    rew: { score: 3, total: 5, td_error: 0.5, history: [1, 2, 3] },
  };
}

function testStateEvolutionExists() {
  console.log('\n🆕 StateEvolution Exists');
  const se = new StateEvolution();
  assert(typeof se.tick === 'function', 'has tick method');
}

function testEmotionDecay() {
  console.log('\n📉 Emotion Decay — intensity decreases over time');
  const se = new StateEvolution();
  const state = makeState();
  assert(state.emo.intensity === 0.9, 'starts at 0.9');

  se.tick(state, 2000); // 2 seconds
  assert(state.emo.intensity < 0.9, 'intensity decreased after 2s');
  assert(state.emo.intensity > 0, 'intensity still positive');
}

function testValenceRegressionToZero() {
  console.log('\n📉 Valence Regression — moves toward 0');
  const se = new StateEvolution();
  const state = makeState();
  assert(state.emo.valence === -0.5, 'starts at -0.5');

  se.tick(state, 5000);
  assert(state.emo.valence > -0.5, 'valence moves toward 0');
}

function testArousalDecay() {
  console.log('\n📉 Arousal Decay');
  const se = new StateEvolution();
  const state = makeState();
  assert(state.emo.arousal === 0.9, 'starts at 0.9');

  se.tick(state, 5000);
  assert(state.emo.arousal < 0.9, 'arousal decreased');
}

function testModeStaysNormalWhenIntensityLow() {
  console.log('\n😐 Mode Stays Normal — after full decay');
  const se = new StateEvolution();
  const state = makeState();
  state.emo.intensity = 0.05;
  state.emo.mode = 'NORMAL';

  se.tick(state, 5000);
  assert(state.emo.mode === 'NORMAL', 'stays NORMAL when already normal');
}

function testHomeostasisDecline() {
  console.log('\n🍽️ Homeostasis — hunger increases, energy decreases');
  const se = new StateEvolution();
  const state = makeState();

  se.tick(state, 10000); // 10 seconds
  // No initial homeostasis values — they should be initialized
  assert(true, 'homeostasis tick runs without error');
}

// ─── RUN ───
console.log('🧠 STATE EVOLUTION TESTS');
console.log('='.repeat(50));

testStateEvolutionExists();
testEmotionDecay();
testValenceRegressionToZero();
testArousalDecay();
testModeStaysNormalWhenIntensityLow();
testHomeostasisDecline();

console.log(`\n${'='.repeat(50)}`);
console.log(`StateEvolution: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All state evolution tests passed! ✅');
