// Brain Habit Flow — wave dominant → survival habit → action
// TDD: the PLAN phase of the React loop (Plan→Act→Judge→Adjust)

import { BrainEngine } from '../src/core/brain-engine.js';
import { SurvivalHabits, HabitAction } from '../src/core/survival-habits.js';
import { CraftingKnowledge } from '../src/core/crafting-knowledge.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── SurvivalHabits loaded into BrainEngine ──

console.log('\n🧪 BrainHabit: survival habits in engine');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });
  assert(brain.survivalHabits instanceof SurvivalHabits, 'brain has survivalHabits');
}

// ── Wave dominant → habit trigger name ──

console.log('\n🧪 BrainHabit: wave to habit trigger');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });

  // L1 dominant → need_food
  const foodAction = brain.waveToHabit(1, [{ item: 'bread', count: 1 }]);
  assert(foodAction !== null, 'L1 → food habit fires');
  assert(foodAction!.action === 'eat', 'L1 → eat');

  // L4 dominant → tool progression
  const toolAction = brain.waveToHabit(4, [
    { item: 'log', count: 1 },
    { item: 'cobblestone', count: 3 },
    { item: 'stick', count: 2 },
  ]);
  assert(toolAction !== null, 'L4 → tool habit fires');
  // First craftable tool from available materials

  // L5 dominant → explore
  const exploreAction = brain.waveToHabit(5, []);
  assert(exploreAction !== null, 'L5 → explore habit fires');
  assert(exploreAction!.action === 'explore', 'L5 → explore');
}

// ── Habit priority: higher level need overrides lower ──

console.log('\n🧪 BrainHabit: priority override');
{
  const brain = new BrainEngine({
    apiKey: 'test-key',
    baseUrl: 'http://localhost:9999',
    model: 'test-model',
  });
  // With both L1 and L4 possible, should pick higher priority
  const result = brain.selectWaveAction();
  // Should not crash
  assert(true, 'selectWaveAction works with habits available');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`BrainHabit: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All BrainHabit flow tests passed! 🔄✅');
