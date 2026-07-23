// Maslow Wave Curiosity — L5 builds when tools exist and idle
// Tech-stage gated: L5 only accumulates at techStage >= 2 (has tools)
// Ensures bot explores new areas after basic survival is secured

import { MaslowWaveSystem } from '../src/core/maslow-wave.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── techStage=0: L5 stays 0 (survival first) ──

console.log('\n🧪 Boredom: techStage=0 → L5 stays 0');
{
  const wave = new MaslowWaveSystem();
  for (let i = 0; i < 100; i++) wave.tick({ techStage: 0 });
  const l5 = wave.state[5];
  assert(l5 === 0, `L5 stays 0 at techStage=0 (got ${l5.toFixed(3)})`);
}

// ── techStage=2: L5 builds over idle ticks ──

console.log('\n🧪 Boredom: techStage=2 idle → L5 accumulates');
{
  const wave = new MaslowWaveSystem();
  // Tick 100 times idle with tools (techStage=2)
  for (let i = 0; i < 100; i++) wave.tick({ techStage: 2, moved: false });
  const l5 = wave.state[5];
  assert(l5 > 0.1, `L5 rises above 0.1 after 100 idle ticks at techStage=2 (got ${l5.toFixed(3)})`);
}

// ── techStage=2 moving: L5 decays ──

console.log('\n🧪 Boredom: techStage=2 moving → L5 decays');
{
  const wave = new MaslowWaveSystem();
  // Build L5 with idle ticks
  for (let i = 0; i < 50; i++) wave.tick({ techStage: 2, moved: false });
  const l5AfterBuild = wave.state[5];
  assert(l5AfterBuild > 0.05, `L5 built up (${l5AfterBuild.toFixed(3)})`);
  // Then move — L5 should decay
  for (let i = 0; i < 20; i++) wave.tick({ techStage: 2, moved: true });
  const l5AfterMove = wave.state[5];
  assert(l5AfterMove < l5AfterBuild || Math.abs(l5AfterMove - l5AfterBuild) < 0.01,
    `L5 decays or stays when moving (was ${l5AfterBuild.toFixed(3)}, now ${l5AfterMove.toFixed(3)})`);
}

// ── L5 suppressed when other needs high at techStage=0 ──

console.log('\n🧪 Boredom: hunger suppresses L5 (techStage=0)');
{
  const wave = new MaslowWaveSystem();
  wave.applyDelta(1, 0.9);  // very hungry
  for (let i = 0; i < 100; i++) wave.tick({ techStage: 0 });
  const l5WithHunger = wave.state[5];
  assert(l5WithHunger === 0, `L5 stays 0 when hungry at techStage=0 (got ${l5WithHunger.toFixed(3)})`);
}

// ── L5 builds at techStage=3 faster ──

console.log('\n🧪 Boredom: techStage=3 accumulates faster than techStage=2');
{
  const wave2 = new MaslowWaveSystem();
  const wave3 = new MaslowWaveSystem();
  for (let i = 0; i < 100; i++) {
    wave2.tick({ techStage: 2, moved: false });
    wave3.tick({ techStage: 3, moved: false });
  }
  assert(wave3.state[5] > wave2.state[5],
    `techStage=3 L5 (${wave3.state[5].toFixed(3)}) > techStage=2 L5 (${wave2.state[5].toFixed(3)})`);
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`Boredom: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All Boredom tests passed! 🌊✅');
