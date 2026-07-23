// TDD RED: Cognitive override — LLM action beats habit/prerequisite
// When a cognitive directive is set, tick() returns it instead of habit-driven actions.
// Override is consumed on use (one-shot) to prevent infinite loops.

import { BrainEngine } from '../src/core/brain-engine.js';
import type { WorldSnapshot } from '../src/core/types.js';

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

// ── Test 1: Cognitive override returns specified action ──

console.log('\n🧪 CognitiveOverride: returns specified action');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  // Set cognitive override — even with empty inventory, should NOT return gather('wood')
  engine.setCognitiveOverride({ action: 'craft', params: { item: 'diamond_sword' } });
  const result = await engine.tick(makeSnapshot({ inventory: [] }));
  const action = (result as any).action;
  assert(action !== undefined && action !== null, 'cognitive override returns action');
  assert(action.action === 'craft', `action is craft (got ${action.action})`);
  assert(action.params?.item === 'diamond_sword', `item is diamond_sword (got ${action.params?.item})`);
}

// ── Test 2: Override consumed after one tick ──

console.log('\n🧪 CognitiveOverride: consumed on use');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  engine.setCognitiveOverride({ action: 'explore', params: {} });
  await engine.tick(makeSnapshot({ inventory: [] }));
  // Second tick — should fall back to normal behavior (gather, since no wood)
  const result2 = await engine.tick(makeSnapshot({ inventory: [] }));
  const action2 = (result2 as any).action;
  // Should NOT be explore (override was consumed)
  assert(action2?.action !== 'explore', `override consumed (got ${action2?.action || 'none'})`);
}

// ── Test 3: No override → normal behavior ──

console.log('\n🧪 CognitiveOverride: no override → habit behavior');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  // No cognitive override set
  const result = await engine.tick(makeSnapshot({ inventory: [] }));
  const action = (result as any).action;
  // Should be normal habit (gather) or cognitive (no action)
  if (action) {
    assert(action.action === 'gather', `habit action base (got ${action.action})`);
  } else {
    assert(true, 'no action (cognitive path)');
  }
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`CognitiveOverride: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All CognitiveOverride tests passed! 🧠✅');
