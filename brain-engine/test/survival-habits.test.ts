// SurvivalHabits — seeded procedural memory for Minecraft survival
// TDD: habits fire automatically when conditions match

import { SurvivalHabits } from '../src/core/survival-habits.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── Seed exists ──

console.log('\n🧪 SurvivalHabits: seeds loaded');
{
  const habits = new SurvivalHabits();
  const all = habits.getAllTriggers();
  assert(all.length > 0, 'seeded habits exist');
  assert(all.includes('need_planks'), 'need_planks habit seeded');
  assert(all.includes('need_stone_pickaxe'), 'need_stone_pickaxe habit seeded');
}

// ─── need_planks: when has log, craft planks ──

console.log('\n🧪 SurvivalHabits: need_planks');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_planks', [
    { item: 'log', count: 2 },
    { item: 'dirt', count: 5 },
  ]);
  assert(action !== null, 'returns action when has log');
  assert(action!.action === 'craft', 'action is craft');
  assert(action!.params.item === 'planks', 'craft planks');
}

// ── need_planks: no log → no action ──

console.log('\n🧪 SurvivalHabits: need_planks no log');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_planks', [
    { item: 'dirt', count: 5 },
    { item: 'stone', count: 3 },
  ]);
  assert(action === null, 'null when no log');
}

// ── need_stone_pickaxe: has cobblestone+stick → craft ├─

console.log('\n🧪 SurvivalHabits: need_stone_pickaxe');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_stone_pickaxe', [
    { item: 'cobblestone', count: 5 },
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
  ]);
  assert(action !== null, 'craft stone pickaxe when has materials');
  assert(action!.params.item === 'stone_pickaxe', 'craft stone_pickaxe');
}

// ── need_iron_pickaxe: missing materials → returns gather sub-goal ──

console.log('\n🧪 SurvivalHabits: need_iron_pickaxe missing');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_iron_pickaxe', [
    { item: 'stick', count: 4 },
    { item: 'crafting_table', count: 1 },
    // no iron_ingot
  ]);
  // Should return a "need_iron_ingot" sub-goal
  assert(action !== null, 'returns sub-goal when missing materials');
  assert(action!.action === 'gather', 'sub-goal is gather');
}

// ── need_food: has food in inventory → eat ──

console.log('\n🧪 SurvivalHabits: need_food');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_food', [
    { item: 'bread', count: 3 },
    { item: 'cooked_beef', count: 2 },
  ]);
  assert(action !== null, 'eat when has food');
  assert(action!.action === 'eat', 'action is eat');
}

// ── need_food: no food → seek ──

console.log('\n🧪 SurvivalHabits: need_food none');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_food', [
    { item: 'dirt', count: 5 },
    { item: 'stone', count: 3 },
  ]);
  assert(action !== null, 'seek food when none in inventory');
  assert(action!.action === 'gather', 'action is gather');
  assert(action!.params.resource === 'food', 'resource is food');
}

// ── need_bed: has wool+planks → craft ├─

console.log('\n🧪 SurvivalHabits: need_bed craft');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_bed', [
    { item: 'wool', count: 3 },
    { item: 'planks', count: 5 },
  ]);
  assert(action !== null, 'craft bed when has materials');
  assert(action!.params.item === 'bed', 'craft bed');
}

// ── need_bed: no wool → gather sub-goal ──

console.log('\n🧪 SurvivalHabits: need_bed missing wool');
{
  const habits = new SurvivalHabits();
  const action = habits.match('need_bed', [
    { item: 'planks', count: 5 },
    // no wool
  ]);
  assert(action !== null, 'returns sub-goal when missing wool');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`SurvivalHabits: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All SurvivalHabits tests passed! 🧬✅');
