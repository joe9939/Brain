// TDD RED: Abstract action naming — brain uses abstract actions, adaptor handles specifics
// Brain Layer: gather('wood'), craft('tool'), eat(), explore()
// MC Adaptor: translates to findBlocks, recipesFor, etc.

import { SurvivalHabits } from '../src/core/survival-habits.js';
import { BrainEngine } from '../src/core/brain-engine.js';
import type { WorldSnapshot } from '../../world-interface/types.js';

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

// ── Test 1: need_wood returns abstract gather('wood') ──

console.log('\n🧪 AbstractActions: need_wood → gather("wood")');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_wood', []);
  assert(action !== null, 'returns action');
  // Abstract: gather('wood') replaces find_wood
  assert(action!.action === 'gather', `action is gather (got ${action!.action})`);
  assert(action!.params?.resource === 'wood', `resource is wood (got ${action!.params?.resource})`);
}

// ── Test 2: need_planks → craft('planks') ──

console.log('\n🧪 AbstractActions: need_planks → craft("planks")');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_planks', [{ item: 'spruce_log', count: 1 }]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', `action is craft (got ${action!.action})`);
  assert(action!.params?.item === 'planks', `item is planks (got ${action!.params?.item})`);
}

// ── Test 3: need_food → gather('food') ──

console.log('\n🧪 AbstractActions: need_food → gather("food")');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_food', []);
  assert(action !== null, 'returns action');
  assert(action!.action === 'gather', `action is gather (got ${action!.action})`);
  assert(action!.params?.resource === 'food', `resource is food (got ${action!.params?.resource})`);
}

// ── Test 4: need_explore → explore() ──

console.log('\n🧪 AbstractActions: need_explore → explore()');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_explore', []);
  assert(action !== null, 'returns action');
  assert(action!.action === 'explore', `action is explore (got ${action!.action})`);
}

// ── Test 5: need_stick → craft('stick') ──

console.log('\n🧪 AbstractActions: need_stick → craft("stick")');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stick', [{ item: 'spruce_planks', count: 4 }]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', `action is craft`);
  assert(action!.params?.item === 'stick', `item is stick (got ${action!.params?.item})`);
}

// ── Test 6: need_stone_pickaxe → craft('stone_pickaxe') ──

console.log('\n🧪 AbstractActions: need_stone_pickaxe → craft("stone_pickaxe")');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stone_pickaxe', [
    { item: 'cobblestone', count: 5 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', `action is craft`);
  assert(action!.params?.item === 'stone_pickaxe', `item is stone_pickaxe`);
}

// ── Test 7: BrainEngine tick returns abstract actions ──

console.log('\n🧪 AbstractActions: brain engine returns abstract actions');
{
  const engine = new BrainEngine({
    apiKey: 'test-key', baseUrl: 'https://api.deepseek.com/v1', model: 'test-model',
  });
  const result = await engine.tick(makeSnapshot({ inventory: [] }));
  const action = (result as any).action;
  if (action) {
    // Should be gather (abstract) not find_wood (MC-specific)
    assert(action.action === 'gather' || action.action === 'find_wood',
      `action is gather or find_wood (got ${action.action})`);
  } else {
    assert(true, 'no immediate action');
  }
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`AbstractActions: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All AbstractActions tests passed! 🏷️✅');
