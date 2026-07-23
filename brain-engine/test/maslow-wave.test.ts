// Maslow Wave Model — TDD: continuous intensity wave engine
// Replaces binary MaslowSystem with ODE-based wave dynamics

import { MaslowWaveSystem } from '../src/core/maslow-wave.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function approx(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) < tol;
}

// ── Baseline & state shape ──

console.log('\n🧪 MaslowWave: Baseline & state shape');
{
  const wave = new MaslowWaveSystem();
  const s = wave.state;
  assert(typeof s[1] === 'number', 'L1 is number');
  assert(typeof s[2] === 'number', 'L2 is number');
  assert(typeof s[3] === 'number', 'L3 is number');
  assert(typeof s[4] === 'number', 'L4 is number');
  assert(typeof s[5] === 'number', 'L5 is number');
  assert(s[1] === 0, 'L1 = 0 when fully satisfied (no background hunger)');
  assert(s[5] === 0, 'L5 = 0 (self-actualization starts silent)');
}

// ── applyDelta ──

console.log('\n🧪 MaslowWave: applyDelta');
{
  const wave = new MaslowWaveSystem();
  const before = wave.state[1];
  wave.applyDelta(1, 0.5);
  assert(wave.state[1] > before, 'applyDelta(1, 0.5) increases L1');
  assert(wave.state[1] <= 1, 'L1 clamped to ≤ 1');
}

// ── Decay ──

console.log('\n🧪 MaslowWave: decay over time');
{
  const wave = new MaslowWaveSystem();
  wave.applyDelta(1, 0.8);
  const afterSpike = wave.state[1];
  wave.tick();
  wave.tick();
  assert(wave.state[1] < afterSpike, 'L1 decays after 2 ticks');
}

// ── Phase classification ──

console.log('\n🧪 MaslowWave: phase classification');
{
  // RISING: big trigger → intensity increasing
  const w1 = new MaslowWaveSystem();
  w1.applyDelta(2, 0.9);
  assert(w1.getPhase(2) === 'RISING', 'big L2 trigger → RISING phase');

  // PEAK: high + stable
  const w2 = new MaslowWaveSystem();
  w2.applyDelta(1, 1.0);
  for (let i = 0; i < 10; i++) w2.tick();
  w2.applyDelta(1, 0.3);  // re-trigger to maintain
  const p = w2.getPhase(1);
  assert(p === 'PEAK' || p === 'RISING', `L1 after maintain → PEAK or RISING (got ${p})`);

  // DORMANT: low/no intensity
  assert(w1.getPhase(5) === 'DORMANT', 'L5 untouched → DORMANT');
}

// ── Dominant need ──

console.log('\n🧪 MaslowWave: dominant need');
{
  // L1 dominates when strong
  const w1 = new MaslowWaveSystem();
  w1.applyDelta(1, 0.9);
  const d1 = w1.getDominant();
  assert(d1 !== null, 'dominant not null when L1 high');
  assert(d1!.level === 1, 'L1 dominates with high hunger');

  // Lower level wins at equal intensity (hierarchical weight)
  const w2 = new MaslowWaveSystem();
  w2.applyDelta(2, 0.5);
  w2.applyDelta(3, 0.5);
  const d2 = w2.getDominant();
  assert(d2 !== null, 'dominant not null when L2/L3 equal');
  assert(d2!.level === 2, 'L2 beats L3 at same intensity (higher weight)');
}

// ── Hormone modulation ──

console.log('\n🧪 MaslowWave: hormone modulation');
{
  // Adrenaline → faster decay resistance (slows decay)
  const normal = new MaslowWaveSystem();
  const adrenal = new MaslowWaveSystem();
  normal.applyDelta(2, 0.6);
  adrenal.applyDelta(2, 0.6);
  adrenal.setHormoneModulators({ adrenaline: 0.9 });  // high adrenaline
  normal.tick();
  adrenal.tick();
  assert(adrenal.state[2] > normal.state[2], 'adrenaline slows L2 decay (holds fear longer)');

  // Cortisol → slower decay (chronic stress = lingering needs)
  const wNormal = new MaslowWaveSystem();
  const wCortisol = new MaslowWaveSystem();
  wNormal.applyDelta(1, 0.5);
  wCortisol.applyDelta(1, 0.5);
  wCortisol.setHormoneModulators({ cortisol: 0.8 });
  for (let i = 0; i < 5; i++) { wNormal.tick(); wCortisol.tick(); }
  assert(wCortisol.state[1] > wNormal.state[1], 'cortisol slows L1 decay (stress retains hunger)');

  // Dopamine → higher L5 baseline (curiosity/motivation)
  const wLowDopa = new MaslowWaveSystem();
  const wHighDopa = new MaslowWaveSystem();
  wHighDopa.setHormoneModulators({ dopamine: 0.9 });
  // No triggers — just tick both
  for (let i = 0; i < 3; i++) { wLowDopa.tick(); wHighDopa.tick(); }
  assert(wHighDopa.state[5] >= wLowDopa.state[5], 'dopamine sustains L5 curiosity baseline');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`MaslowWave: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All MaslowWave tests passed! 🌊✅');
