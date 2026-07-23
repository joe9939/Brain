// Wave-Aware Action Priority — pure function TDD
// modulatePriority adjusts action priority based on dominant Maslow need

import { modulatePriority } from '../../adapter/minecraft/mc-act.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── No dominant → no boost ──

console.log('\n🧪 WaveAction: no dominant');
{
  assert(modulatePriority('seek_food', null) === 1.0, 'null dominant → 1.0');
  assert(modulatePriority('wander', null) === 1.0, 'null dominant wander → 1.0');
  assert(modulatePriority('build_shelter', null) === 1.0, 'null dominant build → 1.0');
}

// ── L1 dominant → survival actions boosted ──

console.log('\n🧪 WaveAction: L1 dominant (hunger)');
{
  const d = { level: 1 as const, intensity: 0.8 };
  assert(modulatePriority('seek_food', d) > 1.0, 'seek_food boosted by L1');
  assert(modulatePriority('flee', d) > 1.0, 'flee boosted by L1');
  assert(modulatePriority('place_block', d) > 1.0, 'place_block boosted by L1');

  // Non-survival actions not boosted
  assert(modulatePriority('wander', d) === 1.0, 'wander not boosted by L1');
  assert(modulatePriority('explore', d) === 1.0, 'explore not boosted by L1');
  assert(modulatePriority('craft_tool', d) === 1.0, 'craft_tool not boosted by L1');
}

// ── Boost scales with intensity ──

console.log('\n🧪 WaveAction: intensity scaling');
{
  const low = { level: 1 as const, intensity: 0.3 };
  const high = { level: 1 as const, intensity: 0.9 };
  const lowBoost = modulatePriority('seek_food', low);
  const highBoost = modulatePriority('seek_food', high);
  assert(highBoost > lowBoost, 'higher intensity → higher boost');
  assert(lowBoost > 1.0, 'even low intensity → boost > 1.0');
  assert(highBoost <= 1.5, 'boost capped at 1.5');
}

// ── L2 dominant → safety actions boosted ──

console.log('\n🧪 WaveAction: L2 dominant (fear)');
{
  const d = { level: 2 as const, intensity: 0.7 };
  assert(modulatePriority('flee', d) > 1.0, 'flee boosted by L2');
  assert(modulatePriority('build_shelter', d) > 1.0, 'build_shelter boosted by L2');
  assert(modulatePriority('move_to_surface', d) > 1.0, 'move_to_surface boosted by L2');
  assert(modulatePriority('seek_food', d) === 1.0, 'seek_food not boosted by L2');
}

// ── L5 dominant → exploration actions boosted ──

console.log('\n🧪 WaveAction: L5 dominant (curiosity)');
{
  const d = { level: 5 as const, intensity: 0.6 };
  assert(modulatePriority('wander', d) > 1.0, 'wander boosted by L5');
  assert(modulatePriority('explore', d) > 1.0, 'explore boosted by L5');
  assert(modulatePriority('seek_food', d) === 1.0, 'seek_food not boosted by L5');
  assert(modulatePriority('flee', d) === 1.0, 'flee not boosted by L5');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`WaveAction: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All WaveAction tests passed! 🎯✅');
