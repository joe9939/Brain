// BrainEngine context injection — wave dominant → hormone context
// TDD: buildHormoneContext accepts optional dominant parameter

import { BrainEngine } from '../src/core/brain-engine.js';
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

// ── buildHormoneContext without dominant ──

console.log('\n🧪 BrainWaveContext: baseline');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  const ctx = brain.hormone.buildHormoneContext();
  assert(typeof ctx === 'string', 'returns string');
  assert(ctx.includes('Hormones'), 'has Hormones section');
}

// ── buildHormoneContext with drive state ──

console.log('\n🧪 BrainWaveContext: with drives');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  const ctx = brain.hormone.buildHormoneContext(
    { hunger: 0.8, fear: 0, fatigue: 0, curiosity: 0, social: 0, mastery: 0 },
  );
  assert(ctx.includes('hunger=0.80'), 'drives includes hunger');
}

// ── buildHormoneContext with dominant need ──

console.log('\n🧪 BrainWaveContext: with dominant need');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  const ctx = brain.hormone.buildHormoneContext(
    { hunger: 0.8, fear: 0, fatigue: 0, curiosity: 0, social: 0, mastery: 0 },
    { level: 1, intensity: 0.85 },
  );
  assert(ctx.includes('Dominant Need'), 'context includes Dominant Need section');
  assert(ctx.includes('level=1'), 'dominant includes level=1');
  assert(ctx.includes('intensity=0.85'), 'dominant includes intensity=0.85');
}

// ── buildHormoneContext with dominant but no drives ──

console.log('\n🧪 BrainWaveContext: dominant without drives');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  const ctx = brain.hormone.buildHormoneContext(undefined, { level: 2, intensity: 0.9 });
  assert(ctx.includes('Dominant Need'), 'dominant section present even without drives');
  assert(ctx.includes('level=2'), 'dominant level=2');
}

// ── Wave state accessible after snapshot update ──

console.log('\n🧪 BrainWaveContext: wave state from waveIntegrator');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  brain.waveIntegrator.update(baseSnapshot);
  // All levels at 0 when fully satisfied
  const l1 = brain.waveIntegrator.getWaveState(1);
  assert(typeof l1 === 'number', 'wave state is a number');
  assert(l1 === 0, 'L1 = 0 when food=20');

  // But the hormone context still works with explicit dominant
  const ctx = brain.hormone.buildHormoneContext(undefined, { level: 1, intensity: 0.8 });
  assert(ctx.includes('Dominant Need'), 'dominant injectable into hormone context');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`BrainWaveContext: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All BrainWaveContext tests passed! 🧠✅');
