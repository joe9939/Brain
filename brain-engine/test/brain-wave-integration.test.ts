// BrainEngine × WaveIntegrator — TDD: wiring wave into engine
// Tests the integration contract without requiring LLM calls

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

// ── WaveIntegrator property exists ──

console.log('\n🧪 BrainWave: waveIntegrator injection');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  assert(typeof brain.waveIntegrator === 'object' && brain.waveIntegrator !== null,
    'BrainEngine has waveIntegrator property');
}

// ── Wave state updates ──

console.log('\n🧪 BrainWave: wave state accessible');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  brain.waveIntegrator.update(baseSnapshot);
  const l1state = brain.waveIntegrator.getWaveState(1);
  assert(typeof l1state === 'number', 'L1 wave state is a number');
  // L1=0 when fully satisfied (food=20). Only rises when need gap exists.
  assert(l1state >= 0, 'L1 wave state is >= 0 when full');
}

// ── Hunger drop affects wave state ──

console.log('\n🧪 BrainWave: hunger delta affects wave');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  brain.waveIntegrator.update(baseSnapshot);  // baseline: hunger=20
  const beforeHunger = brain.waveIntegrator.getWaveState(1);

  const hungry = { ...baseSnapshot, hunger: 3 };
  brain.waveIntegrator.update(hungry);
  const afterHunger = brain.waveIntegrator.getWaveState(1);
  assert(afterHunger > beforeHunger, 'hunger drop (20→3) → L1 wave rises');
}

// ── getDominant works ──

console.log('\n🧪 BrainWave: getDominant works');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  const dominant = brain.waveIntegrator.getDominant();
  // All levels=0 when fully satisfied → no dominant need
  assert(dominant === null, 'no dominant when all levels satisfied');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`BrainWave: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All BrainWave integration tests passed! 🧠✅');
