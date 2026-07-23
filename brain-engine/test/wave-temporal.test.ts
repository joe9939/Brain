// Wave Temporal Fields — TDD: threatTrend, timeSinceLastMeal

import { WaveTriggerMapper } from '../src/core/wave-trigger-mapper.js';
import { WorldSnapshot } from '../../world-interface/types.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const base: WorldSnapshot = {
  position: { x: 0, y: 64, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  health: 20, hunger: 20, oxygen: 20, timeOfDay: 6000,
  onFire: false, inLava: false, falling: false,
  blocks: [], entities: [], inventory: [],
  dimension: 'overworld',
};

// ── threatTrend works when provided ──

console.log('\n🧪 WaveTemporal: threatTrend on WorldSnapshot');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...base, threatTrend: 'stable' as const };
  const curr = { ...base, threatTrend: 'increasing' as const, entities: [{ id: 'z1', type: 'zombie', position: { x: 5, y: 64, z: 5 }, velocity: { x: 0, y: 0, z: 0 } }] };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[2] !== undefined, 'threatTrend increasing + new zombie → L2 delta');
  assert(deltas[2]! > 0, 'L2 delta positive');
}

// ── WorldSnapshot type supports new fields ──

console.log('\n🧪 WaveTemporal: type compatibility');
{
  // Verify we can create snapshots with the new fields
  const s: WorldSnapshot = {
    ...base,
    threatTrend: 'increasing',
    timeSinceLastMeal: 100,
  };
  assert(s.threatTrend === 'increasing', 'threatTrend field assignable');
  assert(s.timeSinceLastMeal === 100, 'timeSinceLastMeal field assignable');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`WaveTemporal: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All WaveTemporal tests passed! ⏱️✅');
