// TDD RED: craft_next_tool — auto-detect tool progression from inventory
// Given current inventory, determine the next tool to craft.
// Tech tree: wooden_pickaxe → stone_pickaxe → iron_pickaxe → diamond_pickaxe
// Each tier needs the previous tier's tool + materials.

import { SurvivalHabits } from '../src/core/survival-habits.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── No materials → returns need_wood ──

console.log('\n🧪 CraftNextTool: empty inventory → need_wood');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_wood', []);
  assert(action !== null, 'returns action when no wood');
  assert(action!.action === 'gather', 'action is gather when empty');
}

// ── Has wood but no tools → craft planks ──

console.log('\n🧪 CraftNextTool: has wood → craft planks');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_planks', [{ item: 'spruce_log', count: 1 }]);
  assert(action !== null, 'returns action when has log');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'planks', 'crafts planks');
}

// ── Has planks → craft stick ──

console.log('\n🧪 CraftNextTool: has planks → craft stick');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stick', [{ item: 'spruce_planks', count: 4 }]);
  assert(action !== null, 'returns action when has planks');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'stick', 'crafts stick');
}

// ── Has planks + stick → craft crafting table ──

console.log('\n🧪 CraftNextTool: has planks + stick → craft crafting table');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_crafting_table', [
    { item: 'spruce_planks', count: 4 },
    { item: 'stick', count: 4 },
  ]);
  assert(action !== null, 'returns action when has materials');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'crafting_table', 'crafts crafting table');
}

// ── Has all for wooden pickaxe → craft it ──

console.log('\n🧪 CraftNextTool: has planks + stick + table → wooden_pickaxe');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_wooden_pickaxe', [
    { item: 'spruce_planks', count: 4 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'wooden_pickaxe', 'crafts wooden pickaxe');
}

// ── Has cobblestone → stone pickaxe ──

console.log('\n🧪 CraftNextTool: has cobblestone + stick → stone pickaxe');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stone_pickaxe', [
    { item: 'cobblestone', count: 5 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'stone_pickaxe', 'crafts stone pickaxe');
}

// ── Has nothing for stone pickaxe → need cobblestone ──

console.log('\n🧪 CraftNextTool: no cobblestone → need gather cobblestone');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stone_pickaxe', [
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  // No cobblestone → should return a gathering/digging action
  assert(action !== null, 'returns action');
  assert(action!.action === 'gather',
    `action is gather (got ${action!.action})`);
}

// ── Has iron ingot → craft iron pickaxe ──

console.log('\n🧪 CraftNextTool: has iron_ingot + stick → iron pickaxe');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_iron_pickaxe', [
    { item: 'iron_ingot', count: 5 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  assert(action !== null, 'returns action');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'iron_pickaxe', 'crafts iron pickaxe');
}

// ── Has iron ore but no furnace → need furnace first ──

console.log('\n🧪 CraftNextTool: has iron_ore + cobblestone → craft furnace');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_iron_pickaxe', [
    { item: 'iron_ore', count: 3 },
    { item: 'cobblestone', count: 10 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  // Has iron_ore but no furnace and no iron_ingot → should lead toward furnace
  assert(action !== null, 'returns action');
  // Should be something toward furnace (craft it, place it, or gather for it)
  assert(['craft', 'place', 'gather'].includes(action!.action),
    `action is valid for furnace sub-goal (got ${action!.action})`);
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`CraftNextTool: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All CraftNextTool tests passed! 🔧✅');
