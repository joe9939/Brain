// Reward System Tests — §2.4: 奖励系统单元测试
// 测试外在奖励/内禀奖励/TD误差

import { RewardSystem } from '../src/core/reward';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testDefaultState() {
  console.log('\n📋 Default State');
  const d = RewardSystem.default();
  assert(d.score === 0, 'default score is 0');
  assert(d.total === 0, 'default total is 0');
  assert(d.td_error === 0, 'default td_error is 0');
  assert(Array.isArray(d.history), 'history is array');
  assert(d.history.length === 0, 'history is empty');
}

function testSuccessfulOutcome() {
  console.log('\n✅ Successful Outcome');
  const rw = new RewardSystem();
  const state = RewardSystem.default();

  const r1 = rw.update(state, { success: true });
  assert(r1.score === 1.0, 'success adds +1.0');
  assert(r1.total === 1, 'total incremented');
  assert(r1.td_error === 1.0, 'td_error = score diff');
}

function testFailedOutcome() {
  console.log('\n❌ Failed Outcome');
  const rw = new RewardSystem();
  const state = RewardSystem.default();

  const r1 = rw.update(state, { success: false });
  assert(r1.score === -0.5, 'failure adds -0.5');
  assert(r1.total === 1, 'total incremented');
  assert(r1.td_error === -0.5, 'negative td_error');
}

function testDurationPenalty() {
  console.log('\n⏱️ Duration Penalty');
  const rw = new RewardSystem();

  // Properly chain state updates
  let state = RewardSystem.default();
  state = rw.update(state, { success: true, duration: 2000 });
  // 0 + 1.0 - 0.2 = 0.8
  assert(state.score === 0.8, 'duration penalty of 0.2 applied');

  state = rw.update(state, { success: true, duration: 10000 });
  // 0.8 + 1.0 - 0.3(max) = 1.5
  assert(state.score === 1.5, 'duration penalty capped at 0.3');
}

function testMultipleUpdates() {
  console.log('\n📊 Multiple Updates');
  const rw = new RewardSystem();
  let state = RewardSystem.default();

  state = rw.update(state, { success: true });
  state = rw.update(state, { success: false });
  state = rw.update(state, { success: true });
  assert(state.total === 3, '3 total updates');
  assert(state.score === 1.5, 'score = 1.0 - 0.5 + 1.0 = 1.5');
  assert(state.history.length === 3, '3 history entries');
}

function testHistoryCap() {
  console.log('\n🔢 History Cap');
  const rw = new RewardSystem();
  let state = RewardSystem.default();

  for (let i = 0; i < 150; i++) {
    state = rw.update(state, { success: true });
  }
  assert(state.history.length <= 100, 'history capped at 100');
  assert(state.score > 0, 'score after many updates');
}

function testIntrinsicReward() {
  console.log('\n💡 Intrinsic Reward');
  const rw = new RewardSystem();

  const r1 = rw.intrinsicReward(0.5);
  assert(r1 === 0.15, 'novelty 0.5 → reward 0.15');

  const r2 = rw.intrinsicReward(1.0);
  assert(r2 === 0.3, 'novelty 1.0 → reward 0.3');

  const r3 = rw.intrinsicReward(10);
  assert(r3 === 1.0, 'novelty 10 → capped at 1.0');
}

function testTDErrorPositive() {
  console.log('\n📈 TD Error');
  const rw = new RewardSystem();
  let state = RewardSystem.default();

  state = rw.update(state, { success: true });
  assert(state.td_error === 1.0, 'first positive td_error');

  state = rw.update(state, { success: true });
  assert(state.td_error > 0, 'second positive td_error');
}

function testTDErrorNegative() {
  console.log('\n📉 TD Error Negative');
  const rw = new RewardSystem();
  let state = RewardSystem.default();

  state = rw.update(state, { success: false });
  assert(state.td_error < 0, 'negative td_error on failure');
}

// ─── RUN ───
console.log('🧠 REWARD SYSTEM UNIT TESTS');
console.log('='.repeat(50));

testDefaultState();
testSuccessfulOutcome();
testFailedOutcome();
testDurationPenalty();
testMultipleUpdates();
testHistoryCap();
testIntrinsicReward();
testTDErrorPositive();
testTDErrorNegative();

console.log(`\n${'='.repeat(50)}`);
console.log(`Reward: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All reward tests passed! ✅');
