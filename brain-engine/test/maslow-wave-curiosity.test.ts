// Maslow Wave Curiosity — L5 tech-tree-gated accumulation
// Design: L5 is NOT "boredom" — it's "mastery drive"
// techStage=0 (empty)  → L5=0 (survival mode, no time for curiosity)
// techStage=1 (has wood) → L5 decays (need to make tools first)
// techStage=2 (has tools) → L5 accumulates when idle, decays when moving
// techStage=3 (stone+)   → L5 accumulates faster (exploration mode)

import { MaslowWaveSystem } from '../src/core/maslow-wave.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── techStage=0: empty inventory, L5 stays 0 ──

console.log('\n🧪 Curiosity: L5=0 when techStage=0 (empty inventory)');
{
  const wave = new MaslowWaveSystem();
  assert(wave.state[5] === 0, 'L5 starts at 0');
  for (let i = 0; i < 200; i++) wave.tick({ techStage: 0 });
  assert(wave.state[5] === 0, `L5 stays 0 after 200 ticks with no tools (${wave.state[5].toFixed(3)})`);
}

// ── techStage=1: has wood but no tools, L5 decays ──

console.log('\n🧪 Curiosity: L5 decays when techStage=1 (has wood, no tools)');
{
  const wave = new MaslowWaveSystem();
  wave.state[5] = 0.5;  // seed some curiosity
  for (let i = 0; i < 50; i++) wave.tick({ techStage: 1 });
  assert(wave.state[5] < 0.1, `L5 decays below 0.1 after 50 ticks (${wave.state[5].toFixed(3)})`);
}

// ── techStage=2: has tools, L5 accumulates when idle ──

console.log('\n🧪 Curiosity: L5 accumulates when idle and has tools');
{
  const wave = new MaslowWaveSystem();
  for (let i = 0; i < 200; i++) wave.tick({ techStage: 2, moved: false });
  assert(wave.state[5] > 0.3, `L5 builds above 0.3 after 200 idle ticks with tools (${wave.state[5].toFixed(3)})`);
}

// ── techStage=2: L5 decays when moving ──

console.log('\n🧪 Curiosity: L5 decays when moving (exploration satisfies)');
{
  const wave = new MaslowWaveSystem();
  wave.state[5] = 0.8;
  for (let i = 0; i < 50; i++) wave.tick({ techStage: 2, moved: true });
  assert(wave.state[5] < 0.5, `L5 drops below 0.5 after 50 moving ticks (${wave.state[5].toFixed(3)})`);
}

// ── techStage=3: L5 accumulates faster (exploration mode) ──

console.log('\n🧪 Curiosity: L5 accumulates faster at techStage=3');
{
  const wave = new MaslowWaveSystem();
  for (let i = 0; i < 100; i++) wave.tick({ techStage: 3, moved: false });
  const l5Stage3 = wave.state[5];

  const wave2 = new MaslowWaveSystem();
  for (let i = 0; i < 100; i++) wave2.tick({ techStage: 2, moved: false });
  assert(l5Stage3 > wave2.state[5],
    `L5 at stage 3 (${l5Stage3.toFixed(3)}) > stage 2 (${wave2.state[5].toFixed(3)}) after 100 idle ticks`);
}

// ── L5 suppressed when hungry ──

console.log('\n🧪 Curiosity: suppressed when hungry');
{
  const wave = new MaslowWaveSystem();
  wave.applyDelta(1, 0.6);  // hungry
  for (let i = 0; i < 200; i++) wave.tick({ techStage: 2, moved: false });
  const l5Hungry = wave.state[5];

  const idle = new MaslowWaveSystem();
  for (let i = 0; i < 200; i++) idle.tick({ techStage: 2, moved: false });

  assert(l5Hungry < idle.state[5],
    `L5 lower when hungry (hungry:${l5Hungry.toFixed(3)} vs idle:${idle.state[5].toFixed(3)})`);
}

// ── L5 suppressed when scared ──

console.log('\n🧪 Curiosity: suppressed when scared');
{
  const wave = new MaslowWaveSystem();
  wave.applyDelta(2, 0.5);  // scared
  for (let i = 0; i < 200; i++) wave.tick({ techStage: 2, moved: false });
  const l5Scared = wave.state[5];

  const idle = new MaslowWaveSystem();
  for (let i = 0; i < 200; i++) idle.tick({ techStage: 2, moved: false });

  assert(l5Scared < idle.state[5],
    `L5 lower when scared (scared:${l5Scared.toFixed(3)} vs idle:${idle.state[5].toFixed(3)})`);
}

// ── L5 eventually dominates over L1 baseline with tools ──

console.log('\n🧪 Curiosity: L5 becomes dominant after prolonged idling with tools');
{
  const wave = new MaslowWaveSystem();
  for (let i = 0; i < 500; i++) wave.tick({ techStage: 2, moved: false });
  const d = wave.getDominant();
  assert(d !== null, 'dominant exists after idling');
  assert(d!.level === 5, `L5 (curiosity) dominant after 500 idle ticks with tools (got L${d!.level})`);
}

// ── L5 never dominates without tools ──

console.log('\n🧪 Curiosity: L5 never dominates without tools');
{
  const wave = new MaslowWaveSystem();
  // Simulate full food (no hunger pressure)
  for (let i = 0; i < 500; i++) wave.tick({ techStage: 0, moved: false });
  const d = wave.getDominant();
  // Should not be L5 (likely L4 with its baseline or null)
  if (d) {
    assert(d!.level !== 5, `L5 NOT dominant after 500 ticks with no tools (got L${d!.level})`);
  } else {
    assert(true, 'no dominant (all needs satisfied) when no tools');
  }
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`Curiosity: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All curiosity tests passed! 🧪✅');
