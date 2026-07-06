// World Model Tests — §2.3: 世界模型单元测试
// 测试代码库依赖图/变更追踪/影响预测

import { WorldModel } from '../src/core/world-model';
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
    emo: { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3, dominance: 0.5 },
    goal: { active: [], completed: 0, history: [] },
    rew: { score: 0, total: 0, td_error: 0, history: [] },
  };
}

function testDefaultState() {
  console.log('\n📋 Default State');
  const d = WorldModel.default();
  assert(d.lastScan === 0, 'default lastScan is 0');
  assert(Array.isArray(d.changedFiles), 'changedFiles is array');
  assert(d.changedFiles.length === 0, 'no changed files initially');
  assert(typeof d.codebaseDigest === 'string', 'codebaseDigest is string');
}

function testUpdateChangedFiles() {
  console.log('\n📝 Update Changed Files');
  const wm = new WorldModel();
  const state = makeState();

  wm.update(state, ['src/foo.ts', 'src/bar.ts']);
  assert(state.wm.changedFiles.length === 2, '2 files tracked');
  assert(state.wm.changedFiles.includes('src/foo.ts'), 'foo.ts tracked');
  assert(state.wm.lastScan > 0, 'lastScan updated');
}

function testUpdateDeduplication() {
  console.log('\n🔍 Update Deduplication');
  const wm = new WorldModel();
  const state = makeState();

  wm.update(state, ['src/foo.ts']);
  wm.update(state, ['src/foo.ts', 'src/bar.ts']);
  assert(state.wm.changedFiles.length === 2, 'deduplicated files');
}

function testUpdateCap() {
  console.log('\n📏 Update Cap');
  const wm = new WorldModel();
  const state = makeState();

  for (let i = 0; i < 100; i++) {
    wm.update(state, [`src/file-${i}.ts`]);
  }
  assert(state.wm.changedFiles.length <= 50, 'file list capped at 50');
}

function testPredictImpact() {
  console.log('\n🔮 Predict Impact');
  const wm = new WorldModel();
  const state = makeState();

  const preds1 = wm.predictImpact(state, 'src/main.ts');
  assert(preds1.length >= 1, 'predicts test files');
  assert(preds1.includes('src/main.test.ts'), 'predicts test file companion');

  const preds2 = wm.predictImpact(state, 'components/button.tsx');
  assert(preds2.length >= 1, 'tsx file prediction');
  assert(preds2.includes('components/button.test.tsx'), 'tsx → test.tsx');
}

function testPredictNonTSCap() {
  console.log('\n📄 Non-TS Predict');
  const wm = new WorldModel();
  const state = makeState();

  const preds = wm.predictImpact(state, 'README.md');
  assert(preds.length === 0, 'no prediction for non-TS files');
}

function testPredictUpdatesState() {
  console.log('\n🔄 Predict Updates State');
  const wm = new WorldModel();
  const state = makeState();

  assert(state.wm.predictions.size === 0, 'no predictions initially');
  wm.predictImpact(state, 'src/main.ts');
  assert(state.wm.predictions.size === 1, 'prediction stored in state');
  assert(state.wm.predictions.has('src/main.ts'), 'file key exists');
}

// ─── RUN ───
console.log('🧠 WORLD MODEL UNIT TESTS');
console.log('='.repeat(50));

testDefaultState();
testUpdateChangedFiles();
testUpdateDeduplication();
testUpdateCap();
testPredictImpact();
testPredictNonTSCap();
testPredictUpdatesState();

console.log(`\n${'='.repeat(50)}`);
console.log(`World Model: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All world model tests passed! ✅');
