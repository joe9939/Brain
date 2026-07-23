// CraftingKnowledge — recipe lookup table TDD

import { CraftingKnowledge, Recipe } from '../src/core/crafting-knowledge.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── Basic recipe lookup ──

console.log('\n🧪 CraftingKnowledge: basic lookup');
{
  const knowledge = new CraftingKnowledge();
  const recipe = knowledge.getRecipe('planks');
  assert(recipe !== null, 'planks recipe exists');
  assert(recipe!.result === 'oak_planks', 'result is oak_planks');
  assert(recipe!.count === 4, 'planks yields 4');
  assert(recipe!.ingredients.length > 0, 'has ingredients');
  assert(recipe!.ingredients[0].item === 'oak_log', 'planks from oak_log');
}

// ── Recipe requires crafting table ──

console.log('\n🧪 CraftingKnowledge: crafting table required');
{
  const knowledge = new CraftingKnowledge();
  const recipe = knowledge.getRecipe('iron_pickaxe');
  assert(recipe !== null, 'iron_pickaxe recipe exists');
  assert(recipe!.needsTable === true, 'iron_pickaxe needs crafting table');
}

// ── Recipe not found ──

console.log('\n🧪 CraftingKnowledge: unknown recipe');
{
  const knowledge = new CraftingKnowledge();
  const recipe = knowledge.getRecipe('netherite_star');
  assert(recipe === null, 'unknown recipe returns null');
}

// ── Tool tier progression ──

console.log('\n🧪 CraftingKnowledge: tool progression');
{
  const knowledge = new CraftingKnowledge();
  const next = knowledge.nextToolTier('wooden_pickaxe');
  assert(next !== null, 'next after wooden exists');
  assert(next === 'stone_pickaxe', 'wooden → stone');

  const afterStone = knowledge.nextToolTier('stone_pickaxe');
  assert(afterStone === 'iron_pickaxe', 'stone → iron');

  const afterIron = knowledge.nextToolTier('iron_pickaxe');
  assert(afterIron === 'diamond_pickaxe', 'iron → diamond');

  const afterDiamond = knowledge.nextToolTier('diamond_pickaxe');
  assert(afterDiamond === 'netherite_pickaxe', 'diamond → netherite');
}

// ── Can craft check ──

console.log('\n🧪 CraftingKnowledge: can craft');
{
  const knowledge = new CraftingKnowledge();
  const hasLog = knowledge.canCraft('planks', [{ item: 'oak_log', count: 1 }]);
  assert(hasLog, 'can craft planks with oak_log');

  const noLog = knowledge.canCraft('planks', [{ item: 'stone', count: 5 }]);
  assert(!noLog, 'cannot craft planks without log');
}

// ── Missing materials ──

console.log('\n🧪 CraftingKnowledge: missing materials');
{
  const knowledge = new CraftingKnowledge();
  const missing = knowledge.missingMaterials('stone_pickaxe', [
    { item: 'cobblestone', count: 3 },
    // missing sticks
  ]);
  assert(missing.length > 0, 'missing sticks detected');
  assert(missing.some(m => m.item === 'stick'), 'one missing is stick');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`CraftingKnowledge: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All CraftingKnowledge tests passed! 📖✅');
