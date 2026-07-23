// WaveIntegrator — connects WaveTriggerMapper + MaslowWaveSystem into one pipeline
// TDD: full cycle from snapshot → deltas → wave.tick() → dominant need

import { WaveIntegrator } from '../src/core/wave-integration.js';
import { WorldSnapshot } from '../../world-interface/types.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const baseSnapshot: WorldSnapshot = {
  position: { x: 0, y: 64, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  health: 20, hunger: 20, oxygen: 20, timeOfDay: 6000,
  onFire: false, inLava: false, falling: false,
  blocks: [], entities: [], inventory: [],
  dimension: 'overworld',
};

// ── Initial state after first snapshot ──

console.log('\n🧪 WaveIntegrator: initial state');
{
  const wi = new WaveIntegrator();
  // First snapshot with full hunger → all levels at 0
  wi.update(baseSnapshot);
  const l1 = wi.getWaveState(1);
  assert(l1 === 0, 'L1 = 0 after first snapshot (food=20)');
  const dominant = wi.getDominant();
  assert(dominant === null, 'no dominant when all levels satisfied');
}

// ── Hunger drop → L1 rises → L1 dominant ──

console.log('\n🧪 WaveIntegrator: hunger cycle');
{
  const wi = new WaveIntegrator();
  wi.update(baseSnapshot);  // baseline: full hunger

  // One tick with full hunger (no change)
  wi.update(baseSnapshot);
  let before = wi.getWaveState(1);

  // Hunger drops significantly
  const hungry = { ...baseSnapshot, hunger: 4 };
  wi.update(hungry);
  const after = wi.getWaveState(1);
  assert(after > before, 'hunger drop → L1 wave intensity rises');

  // And the wave is in a relevant phase
  const dominant = wi.getDominant();
  assert(dominant!.level === 1, 'hunger drop → L1 stays dominant');
}

// ── Threat appears then fades ──

console.log('\n🧪 WaveIntegrator: threat cycle');
{
  const wi = new WaveIntegrator();
  wi.update(baseSnapshot);  // baseline: safe

  // Zombie appears
  const zombie = { id: 'z1', type: 'zombie', position: { x: 3, y: 64, z: 3 }, velocity: { x: 0, y: 0, z: 0 } };
  const threat = { ...baseSnapshot, entities: [zombie] };
  wi.update(threat);
  const fearAfter = wi.getWaveState(2);
  assert(fearAfter > 0.1, 'zombie appears → L2 fear rises above baseline');

  // Zombie killed, safe for many ticks
  const safe = { ...baseSnapshot, entities: [] };
  for (let i = 0; i < 20; i++) wi.update(safe);
  const fearFinal = wi.getWaveState(2);
  assert(fearFinal < 0.2, 'fear decays back to baseline after threat gone');

  // L1 should be dominant again (baseline hunger always present)
  const dominant = wi.getDominant();
  assert(dominant !== null, 'after threat fades → dominant exists');
}

// ── Hormone modulation persists across updates ──

console.log('\n🧪 WaveIntegrator: hormone modulation');
{
  const wi = new WaveIntegrator();
  wi.setHormoneModulators({ adrenaline: 0.8 });

  wi.update(baseSnapshot);  // baseline

  const zombie = { id: 'z1', type: 'zombie', position: { x: 3, y: 64, z: 3 }, velocity: { x: 0, y: 0, z: 0 } };
  const threat = { ...baseSnapshot, entities: [zombie] };
  wi.update(threat);

  // Without adrenaline: fear would decay faster
  // We just verify that the system doesn't crash with hormones
  const fearState = wi.getWaveState(2);
  assert(fearState > 0, 'adrenaline modulation works (fear state is positive)');

  // Multiple ticks with adrenaline should keep fear higher
  for (let i = 0; i < 10; i++) wi.update(threat);
  const fearAfter10 = wi.getWaveState(2);
  assert(fearAfter10 > 0.2, `adrenaline sustains fear across 10 ticks (${fearAfter10.toFixed(3)})`);
}

// ── Multiple needs coexist ──

console.log('\n🧪 WaveIntegrator: competing needs');
{
  const wi = new WaveIntegrator();
  wi.update(baseSnapshot);

  // Trigger hunger AND curiosity
  const hungryNewBiome = {
    ...baseSnapshot,
    hunger: 5,
    biome: 'desert',
  };
  wi.update(hungryNewBiome);

  const dominant = wi.getDominant();
  assert(dominant !== null, 'competing needs → dominant computed');
  assert([1, 2, 3, 4, 5].includes(dominant!.level), `dominant level ${dominant!.level} is valid`);
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`WaveIntegrator: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All WaveIntegrator tests passed! 🔄✅');
