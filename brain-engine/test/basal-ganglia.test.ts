// Test: Basal Ganglia signal competition and gating — arXiv 2504.01990v2 §3.3.4

import { BasalGanglia } from '../src/core/basal-ganglia';
import { MentalState } from '../src/core/types';

function freshState(): MentalState {
  return {
    mem: { working: [], episodic: [], semantic: [], procedural: [] },
    wm: { lastScan: 0, changedFiles: [], codebaseDigest: '', predictions: new Map() },
    emo: { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3, dominance: 0.5 },
    goal: { active: [], completed: 0, history: [] },
    rew: { score: 0, total: 0, td_error: 0, history: [] },
  };
}

// ─── RED: Write failing tests ───

const bg = new BasalGanglia();

// Test 1: perceive wins when L1 is empty (working = [])
{
  const state = freshState();
  const winner = bg.getWinner(state);
  if (!winner || winner.key !== 'perceive') {
    console.log('FAIL: perceive should win when L1 empty');
    process.exit(1);
  }
  console.log('PASS: perceive wins when L1 empty');
}

// Test 2: perceive strength decreases as L1 fills
{
  const state = freshState();
  state.mem.working = ['a', 'b', 'c'];
  const signals = bg.computeSignals(state);
  const perceive = signals.find(s => s.key === 'perceive');
  if (!perceive || perceive.raw !== 0.55) {  // 1.0 - 3*0.15 = 0.55
    console.log(`FAIL: perceive raw should be 0.55, got ${perceive?.raw}`);
    process.exit(1);
  }
  console.log('PASS: perceive strength decreases with L1 progress');
}

// Test 3: CAUTION mode boosts safety signal
{
  const state = freshState();
  state.emo.mode = 'CAUTION';
  state.emo.intensity = 0.9;
  const winner = bg.getWinner(state);
  // safety (0.9×4=3.6) should beat perceive (1.0×5=5) when L1 empty?
  // Actually perceive at L1=0 is 1.0×5=5, safety is 0.9×4=3.6
  // So perceive still wins. But with some L1 done...
  state.mem.working = ['a', 'b', 'c'];
  const winner2 = bg.getWinner(state);
  if (!winner2 || winner2.key !== 'safety' && winner2.key !== 'emotion') {
    console.log(`FAIL: safety/emotion should win in CAUTION mode, got ${winner2?.key}`);
    process.exit(1);
  }
  console.log('PASS: CAUTION boosts safety signal');
}

// Test 4: Gate blocks non-task tools during perceive
{
  const state = freshState();
  const gate = bg.getGate(state, 'bash');
  if (gate.allowAll || !gate.allowedTools?.includes('task')) {
    console.log('FAIL: gate should block non-task tools during perceive');
    process.exit(1);
  }
  console.log('PASS: gate blocks non-task tools during perceive');
}

// Test 5: Gate allows all when idle
{
  const state = freshState();
  state.mem.working = ['a', 'b', 'c', 'd', 'e']; // L1 complete
  state.rew.score = 5;                            // score OK
  const gate = bg.getGate(state, 'bash');
  if (!gate.allowAll) {
    console.log('FAIL: gate should allow all when idle');
    process.exit(1);
  }
  console.log('PASS: gate allows all when idle');
}

// Test 6: isToolAllowed helper
{
  const state = freshState();
  const result = bg.isToolAllowed(state, 'bash');
  if (result.allowed) {
    console.log('FAIL: bash should not be allowed during perceive');
    process.exit(1);
  }
  console.log('PASS: isToolAllowed correctly rejects non-task tools');
}

// Test 7: isToolAllowed allows task during perceive
{
  const state = freshState();
  const result = bg.isToolAllowed(state, 'task');
  if (!result.allowed) {
    console.log('FAIL: task should be allowed during perceive');
    process.exit(1);
  }
  console.log('PASS: isToolAllowed allows task during perceive');
}

// Test 8: Signals sorted by strength descending
{
  const state = freshState();
  const signals = bg.computeSignals(state);
  for (let i = 1; i < signals.length; i++) {
    if (signals[i].strength > signals[i-1].strength) {
      console.log(`FAIL: signals not sorted (${signals[i].key} > ${signals[i-1].key})`);
      process.exit(1);
    }
  }
  console.log('PASS: signals sorted by strength');
}

// Test 9: No winner in null/zero state
{
  const state = freshState();
  state.mem.working = ['a', 'b', 'c', 'd', 'e']; // L1 complete
  state.rew.score = 5;
  const winner = bg.getWinner(state);
  if (winner) {
    console.log(`FAIL: should have no winner when all signals 0, got ${winner.key}`);
    process.exit(1);
  }
  console.log('PASS: no winner when all signals are 0');
}

// Test 10: reward signal when score low
{
  const state = freshState();
  state.mem.working = ['a', 'b', 'c', 'd', 'e']; // L1 complete
  state.rew.score = 2; // low score (< 3)
  const winner = bg.getWinner(state);
  if (!winner || winner.key !== 'reward') {
    console.log(`FAIL: reward should win when score low, got ${winner?.key}`);
    process.exit(1);
  }
  console.log('PASS: reward wins when score low');
}

console.log('\nAll tests passed! ✅');
