// WaveTriggerMapper — WorldSnapshot → Maslow wave applyDelta bridge
// TDD: each trigger type is one RED→GREEN cycle

import { WaveTriggerMapper } from '../src/core/wave-trigger-mapper.js';
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

// ── Identical snapshots → continuous pressure only ──

console.log('\n🧪 WaveTriggerMapper: identical snapshots');
{
  const mapper = new WaveTriggerMapper();
  const deltas = mapper.computeDeltas(baseSnapshot, baseSnapshot);
  // At food=20, health=20, daytime, no threats → L1 pressure = 0
  assert(typeof deltas[1] === 'number', 'L1 delta exists (continuous pressure)');
  assert(deltas[1] === 0, 'L1 delta = 0 when food=20');
}

// ── Hunger drop → L1 positive delta ──

console.log('\n🧪 WaveTriggerMapper: hunger triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, hunger: 20 };
  const curr = { ...baseSnapshot, hunger: 6 };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[1] !== undefined, 'hunger drop (20→6) → L1 delta exists');
  assert(deltas[1]! > 0, 'hunger drop → positive L1 delta');
}

{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, hunger: 6 };
  const curr = { ...baseSnapshot, hunger: 18 };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[1] !== undefined, 'hunger rise (6→18) → L1 delta exists');
  assert(deltas[1]! < 0, 'hunger rise → negative L1 delta (ate food)');
}

{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, hunger: 20 };
  const curr = { ...baseSnapshot, hunger: 19 };
  const deltas = mapper.computeDeltas(prev, curr);
  // Continuous pressure: at food=19, small positive pressure
  assert(typeof deltas[1] === 'number', 'L1 continuous pressure exists');
  assert(deltas[1]! >= 0 && deltas[1]! < 0.01, 'small hunger change → tiny L1 pressure');
}

// ── Health drop → L1 delta ──

console.log('\n🧪 WaveTriggerMapper: health triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, health: 20 };
  const curr = { ...baseSnapshot, health: 8 };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[1] !== undefined, 'health drop (20→8) → L1 delta exists');
  assert(deltas[1]! > 0, 'health drop → positive L1 delta');
}

// ── New hostile entity → L2 positive delta ──

console.log('\n🧪 WaveTriggerMapper: threat triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, entities: [] };
  const curr = {
    ...baseSnapshot,
    entities: [{ id: 'z1', type: 'zombie', position: { x: 5, y: 64, z: 5 }, velocity: { x: 0, y: 0, z: 0 } }],
  };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[2] !== undefined, 'new zombie → L2 delta exists');
  assert(deltas[2]! > 0, 'new zombie → positive L2 delta');
}

{
  const mapper = new WaveTriggerMapper();
  const zombie = { id: 'z1', type: 'zombie', position: { x: 5, y: 64, z: 5 }, velocity: { x: 0, y: 0, z: 0 } };
  const prev = { ...baseSnapshot, entities: [zombie] };
  const curr = { ...baseSnapshot, entities: [] };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[2] !== undefined, 'zombie removed → L2 delta exists');
  assert(deltas[2]! < 0, 'zombie removed → negative L2 delta (relief)');
}

// ── Night trigger → L2 delta ──

console.log('\n🧪 WaveTriggerMapper: night triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, timeOfDay: 6000 };
  const curr = { ...baseSnapshot, timeOfDay: 14000 };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[2] !== undefined, 'day→night → L2 delta exists');
  assert(deltas[2]! > 0, 'day→night → positive L2 delta');
}

{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, timeOfDay: 14000 };
  const curr = { ...baseSnapshot, timeOfDay: 6000 };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[2] !== undefined, 'night→day → L2 delta exists');
  assert(deltas[2]! < 0, 'night→day → negative L2 delta (relief)');
}

// ── New iron tool → L4 positive delta ──

console.log('\n🧪 WaveTriggerMapper: mastery triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, inventory: [] };
  const curr = { ...baseSnapshot, inventory: [{ item: 'iron_pickaxe', count: 1 }] };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[4] !== undefined, 'new iron tool → L4 delta exists');
}

// ── Biome change → L5 positive delta ──

console.log('\n🧪 WaveTriggerMapper: curiosity triggers');
{
  const mapper = new WaveTriggerMapper();
  const prev = { ...baseSnapshot, biome: 'plains' };
  const curr = { ...baseSnapshot, biome: 'forest' };
  const deltas = mapper.computeDeltas(prev, curr);
  assert(deltas[5] !== undefined, 'biome change → L5 delta exists');
  assert(deltas[5]! > 0, 'biome change → positive L5 delta');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`WaveTriggerMapper: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All WaveTriggerMapper tests passed! 🌊✅');
