// TDD RED: Position Episodic Memory — brain records visited positions
// Each tick with a new position creates an episodic memory with position data.
// Same position = no duplicate memory (dedup by rounded block coordinates).

import { BrainEngine } from '../src/core/brain-engine.js';
import type { WorldSnapshot, EpisodicMemory } from '../src/core/types.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(overrides?: Partial<WorldSnapshot>): WorldSnapshot {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20, hunger: 20, oxygen: 20,
    healthDelta: 0, hungerDelta: 0,
    onFire: false, inLava: false, falling: false,
    timeOfDay: 0, dimension: 'overworld',
    blocks: [], entities: [], inventory: [],
    ...overrides,
  };
}

function countPositionMemories(engine: BrainEngine): number {
  return engine.memory.getEpisodicMemories().filter((m: EpisodicMemory) => m.position !== undefined).length;
}

function getPositionMemories(engine: BrainEngine): EpisodicMemory[] {
  return engine.memory.getEpisodicMemories().filter((m: EpisodicMemory) => m.position !== undefined);
}

// ── Test 1: position memory created when moving to new location ──

console.log('\n🧪 PositionMemory: records new position');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  // First tick at origin
  await engine.tick(makeSnapshot({ position: { x: 0, y: 64, z: 0 } }));
  // Second tick at new position → should record
  await engine.tick(makeSnapshot({ position: { x: 10, y: 64, z: 20 } }));
  const count = countPositionMemories(engine);
  assert(count >= 1, `position memory created after moving (got ${count})`);
}

// ── Test 2: same position does not duplicate ──

console.log('\n🧪 PositionMemory: dedup same position');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  // Two ticks at same position
  await engine.tick(makeSnapshot({ position: { x: 5, y: 64, z: 5 } }));
  await engine.tick(makeSnapshot({ position: { x: 5, y: 64, z: 5 } }));
  const count = countPositionMemories(engine);
  assert(count === 0, `no duplicate position memory (got ${count})`);
}

// ── Test 3: position coordinates stored correctly ──

console.log('\n🧪 PositionMemory: coordinates stored');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  await engine.tick(makeSnapshot({ position: { x: 100, y: 64, z: 200 } }));
  await engine.tick(makeSnapshot({ position: { x: 150, y: 65, z: 250 } }));
  const posMemories = getPositionMemories(engine);
  if (posMemories.length > 0) {
    const p = posMemories[0].position!;
    assert(p.x === 150, `recorded x=150 (got ${p.x})`);
    assert(p.y === 65, `recorded y=65 (got ${p.y})`);
    assert(p.z === 250, `recorded z=250 (got ${p.z})`);
  } else {
    assert(false, 'no position memory found');
  }
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`PositionMemory: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All PositionMemory tests passed! 📍✅');
