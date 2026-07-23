// TDD: WaveIntegrator techStage + movement computation
// Ensures tick() receives correct options from update()

import { WaveIntegrator } from '../src/core/wave-integration.js';
import type { WorldSnapshot } from '../../world-interface/types.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(pos: { x: number; y: number; z: number }, inventory: { item: string; count: number }[]): WorldSnapshot {
  return {
    position: pos,
    inventory,
    health: 20,
    hunger: 20,
    oxygen: 20,
    healthDelta: 0,
    hungerDelta: 0,
    onFire: false,
    inLava: false,
    blocks: [],
    entities: [],
  };
}

// ── No movement on first update ──

console.log('\n🧪 WaveTechStage: first update has no movement');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  // First update initializes prevSnapshot, doesn't compute movement
  // techStage should be 0 (empty inventory)
  const l5 = wi.getWaveState(5);
  // With techStage=0, L5 should be 0
  assert(l5 === 0, 'L5=0 after first update with empty inventory');
}

// ── techStage=0 with empty inventory ──

console.log('\n🧪 WaveTechStage: techStage=0 with empty inventory');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  // Still empty → techStage=0 → L5=0
  const l5 = wi.getWaveState(5);
  assert(l5 === 0, `L5=0 for empty inventory (${l5})`);
}

// ── techStage=1 with log in inventory ──

console.log('\n🧪 WaveTechStage: techStage=1 with wood');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, [{ item: 'spruce_log', count: 1 }]));
  // Has wood → techStage=1 → L4 should rise, L5 should decay
  const l4 = wi.getWaveState(4);
  const l5 = wi.getWaveState(5);
  // L5 should be 0 (techStage=1 forces L5 decay)
  assert(l5 === 0, `L5=0 with wood but no tools (${l5})`);
  // L4 should start rising (tool pressure)
  assert(l4 > 0, `L4>0 with wood present (${l4})`);
}

// ── techStage=2 with planks/crafting table ──

console.log('\n🧪 WaveTechStage: techStage=2 with planks');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, [{ item: 'spruce_planks', count: 4 }]));
  // Has planks → techStage=2 → L5 can accumulate
  const l5 = wi.getWaveState(5);
  assert(l5 >= 0, `L5>=0 with planks`);
}

// ── techStage=3 with stone tools ──

console.log('\n🧪 WaveTechStage: techStage=3 with stone pickaxe');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, []));
  wi.update(makeSnapshot({ x: 0, y: 64, z: 0 }, [{ item: 'stone_pickaxe', count: 1 }]));
  const l5 = wi.getWaveState(5);
  assert(l5 >= 0, `L5>=0 with stone tools`);
  // techStage=3 accumulates faster
}

// ── Movement detection: position unchanged ──

console.log('\n🧪 WaveTechStage: no movement when position unchanged');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 10, y: 64, z: 20 }, []));
  // After 200 ticks of same position, L5 should grow (with tools)
  for (let i = 0; i < 200; i++) {
    wi.update(makeSnapshot({ x: 10, y: 64, z: 20 }, [{ item: 'spruce_planks', count: 4 }]));
  }
  const l5 = wi.getWaveState(5);
  // techStage=2 + no movement → L5 accumulates
  assert(l5 > 0.2, `L5 builds when not moving with tools (${l5.toFixed(3)})`);
}

// ── Movement detection: position changes ──

console.log('\n🧪 WaveTechStage: movement suppresses L5');
{
  const wi = new WaveIntegrator();
  wi.update(makeSnapshot({ x: 10, y: 64, z: 20 }, []));
  // After 200 ticks of moving, L5 should be lower
  for (let i = 0; i < 200; i++) {
    wi.update(makeSnapshot({ x: 10 + i * 0.5, y: 64, z: 20 }, [{ item: 'spruce_planks', count: 4 }]));
  }
  const l5Moving = wi.getWaveState(5);

  // Compare with not moving
  const wi2 = new WaveIntegrator();
  wi2.update(makeSnapshot({ x: 10, y: 64, z: 20 }, []));
  for (let i = 0; i < 200; i++) {
    wi2.update(makeSnapshot({ x: 10, y: 64, z: 20 }, [{ item: 'spruce_planks', count: 4 }]));
  }
  const l5Still = wi2.getWaveState(5);

  assert(l5Moving < l5Still, `L5 lower when moving (moving:${l5Moving.toFixed(3)} vs still:${l5Still.toFixed(3)})`);
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`WaveTechStage: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All WaveTechStage tests passed! 📐✅');
