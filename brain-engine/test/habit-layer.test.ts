// Habit Layer Tests — 习惯在线学习
// RED: HabitLayer 不存在

import { HabitLayer } from '../src/core/habit-layer';
import { Action } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testHabitLayerExists() {
  console.log('\n🆕 HabitLayer Exists');
  const hl = new HabitLayer();
  assert(typeof hl.learn === 'function', 'has learn method');
  assert(typeof hl.match === 'function', 'has match method');
  assert(typeof hl.stats === 'function', 'has stats method');
}

function testLearnAndMatch() {
  console.log('\n📖 Learn and Match Habit');
  const hl = new HabitLayer();

  const action: Action = { type: 'mine_block', params: { block: 'stone' } };
  hl.learn('mine stone', action);
  
  const matched = hl.match('mine stone');
  assert(matched !== null, 'habit matched by trigger');
  assert(matched!.action.type === 'mine_block', 'action type stored');
  assert(matched!.frequency === 1, 'frequency starts at 1');
}

function testFrequencyIncreases() {
  console.log('\n📊 Frequency Increases on Repeat');
  const hl = new HabitLayer();

  hl.learn('walk forward', { type: 'move', params: { direction: 'forward' } });
  hl.learn('walk forward', { type: 'move', params: { direction: 'forward' } });
  hl.learn('walk forward', { type: 'move', params: { direction: 'forward' } });
  
  const matched = hl.match('walk forward');
  assert(matched!.frequency === 3, 'frequency = 3 after 3 learns');
}

function testSuccessRate() {
  console.log('\n✅ Success Rate Tracking');
  const hl = new HabitLayer();

  hl.learn('attack', { type: 'attack', params: {} });
  hl.recordSuccess('attack', true);
  hl.recordSuccess('attack', true);
  hl.recordSuccess('attack', false);
  
  const matched = hl.match('attack');
  assert(matched!.successRate > 0, 'success rate tracked');
  assert(matched!.successRate <= 1, 'success rate <= 1');
}

function testNoMatchForUnknown() {
  console.log('\n❌ No Match for Unknown');
  const hl = new HabitLayer();
  
  const matched = hl.match('unknown thing');
  assert(matched === null, 'unknown trigger returns null');
}

function testStats() {
  console.log('\n📈 Stats');
  const hl = new HabitLayer();
  
  hl.learn('a', { type: 'do_a', params: {} });
  hl.learn('b', { type: 'do_b', params: {} });
  hl.learn('c', { type: 'do_c', params: {} });
  
  const stats = hl.stats();
  assert(stats.total === 3, 'stats.total = 3');
  assert(typeof stats.frequent === 'number', 'frequent count returned');
}

function testFrequentHabitsRiseToTop() {
  console.log('\n🏆 Frequent Habits Rank Higher');
  const hl = new HabitLayer();

  hl.learn('rare', { type: 'rare', params: {} });
  for (let i = 0; i < 10; i++) {
    hl.learn('common', { type: 'common', params: {} });
  }
  
  const matched = hl.match('common');
  assert(matched!.frequency === 10, 'common habit has high frequency');
}

// ─── RUN ───
console.log('🧠 HABIT LAYER TESTS');
console.log('='.repeat(50));

testHabitLayerExists();
testLearnAndMatch();
testFrequencyIncreases();
testSuccessRate();
testNoMatchForUnknown();
testStats();
testFrequentHabitsRiseToTop();

console.log(`\n${'='.repeat(50)}`);
console.log(`HabitLayer: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All habit layer tests passed! ✅');
