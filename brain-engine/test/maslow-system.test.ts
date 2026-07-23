// MaslowSystem — 马斯洛需求 L1-L5 评估
// TDD: 纯计算, 无 LLM, 无副作用

import { MaslowSystem, MaslowReport } from '../src/core/maslow-system';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(overrides: Record<string, any> = {}): any {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20,
    healthDelta: 0,
    hunger: 20,
    oxygen: 20,
    onFire: false,
    inLava: false,
    falling: false,
    blocks: [],
    entities: [],
    inventory: [],
    timeOfDay: 6000, // noon
    dimension: 'overworld',
    ...overrides,
  };
}

console.log('\n🧪 MaslowSystem: L1 Physiological');

// RED 1: Full health/hunger → L1 satisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot());
  assert(r.levels[1].satisfied === true, 'full health/hunger → L1 satisfied');
})();

// RED 2: Low hunger → L1 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ hunger: 3 }));
  assert(r.levels[1].satisfied === false, 'hunger=3 → L1 unsatisfied');
  assert(r.bottleneck === 1, 'hunger=3 → bottleneck = 1');
})();

// RED 3: Low health → L1 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ health: 4 }));
  assert(r.levels[1].satisfied === false, 'health=4 → L1 unsatisfied');
})();

// RED 4: On fire → L1 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ onFire: true }));
  assert(r.levels[1].satisfied === false, 'onFire → L1 unsatisfied');
})();

// RED 5: Low oxygen → L1 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ oxygen: 3 }));
  assert(r.levels[1].satisfied === false, 'oxygen=3 → L1 unsatisfied');
})();

// RED 5b: Oxygen=5 (reflex threshold) → L1 satisfied (reflex handles it)
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ oxygen: 5 }));
  assert(r.levels[1].satisfied === true, 'oxygen=5 → L1 satisfied (reflex handles <5)');
})();

// RED 5c: Oxygen=8 → L1 satisfied (not critical)
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ oxygen: 8 }));
  assert(r.levels[1].satisfied === true, 'oxygen=8 → L1 satisfied');
})();

console.log('\n🧪 MaslowSystem: L2 Safety');

// RED 6: Daytime, no hostiles → L2 satisfied
(function() {
  const sys = new MaslowSystem();
  // noon, no entities
  const r = sys.evaluate(makeSnapshot({ timeOfDay: 6000 }));
  assert(r.levels[2].satisfied === true, 'daytime, no hostiles → L2 satisfied');
})();

// RED 7: Night, no shelter → L2 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ timeOfDay: 15000 })); // night
  assert(r.levels[2].satisfied === false, 'night, no bed → L2 unsatisfied');
})();

// RED 8: Hostile entity nearby → L2 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({
    entities: [{ id: 'zombie1', type: 'zombie', position: { x: 5, y: 64, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }],
  }));
  assert(r.levels[2].satisfied === false, 'zombie nearby → L2 unsatisfied');
})();

console.log('\n🧪 MaslowSystem: L3 Social');

// RED 9: Alone → L3 satisfied (MC 单人正常)
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot());
  assert(r.levels[3].satisfied === true, 'alone → L3 satisfied (default)');
})();

console.log('\n🧪 MaslowSystem: L4 Esteem');

// RED 10: No tools → L4 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ inventory: [] }));
  assert(r.levels[4].satisfied === false, 'no tools → L4 unsatisfied');
})();

// RED 11: Full iron tools + bed + furnace → L4 satisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({
    inventory: [
      { item: 'iron_pickaxe', count: 1 },
      { item: 'iron_axe', count: 1 },
      { item: 'iron_sword', count: 1 },
      { item: 'iron_shovel', count: 1 },
      { item: 'crafting_table', count: 1 },
      { item: 'furnace', count: 1 },
      { item: 'chest', count: 1 },
      { item: 'red_bed', count: 1 },
      { item: 'iron_helmet', count: 1 },
      { item: 'iron_chestplate', count: 1 },
      { item: 'iron_leggings', count: 1 },
      { item: 'iron_boots', count: 1 },
    ],
  }));
  assert(r.levels[4].satisfied === true, 'iron tools + armor + tech → L4 satisfied');
})();

console.log('\n🧪 MaslowSystem: L5 Self-actualization');

// RED 12: No active goal → L5 unsatisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot());
  assert(r.levels[5].satisfied === false, 'no active goal → L5 unsatisfied');
})();

// RED 13: With active goal → L5 satisfied
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot(), {
    activeGoal: { description: 'Build a house', progress: 0.3 },
  });
  assert(r.levels[5].satisfied === true, 'has active goal → L5 satisfied');
})();

// RED 13b: Active goal with progress=0 → L5 satisfied (goal exists = enough)
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot(), {
    activeGoal: { description: 'New goal', progress: 0 },
  });
  assert(r.levels[5].satisfied === true, 'progress=0 goal → L5 satisfied (goal exists)');
})();

console.log('\n🧪 MaslowSystem: Bottleneck prioritization');

// RED 14: L1 unsatisfied → bottleneck = 1 (even if L4 also unsatisfied)
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({ hunger: 2, inventory: [] }));
  assert(r.bottleneck === 1, 'hungry + no tools → bottleneck = 1 (lower level wins)');
})();

// RED 15: All levels satisfied → bottleneck = null
(function() {
  const sys = new MaslowSystem();
  const r = sys.evaluate(makeSnapshot({
    inventory: [
      { item: 'iron_pickaxe', count: 1 },
      { item: 'iron_axe', count: 1 },
      { item: 'iron_sword', count: 1 },
      { item: 'iron_shovel', count: 1 },
      { item: 'crafting_table', count: 1 },
      { item: 'furnace', count: 1 },
      { item: 'chest', count: 1 },
      { item: 'red_bed', count: 1 },
      { item: 'iron_helmet', count: 1 },
      { item: 'iron_chestplate', count: 1 },
      { item: 'iron_leggings', count: 1 },
      { item: 'iron_boots', count: 1 },
    ],
  }), { activeGoal: { description: 'Build', progress: 0.5 } });
  assert(r.bottleneck === null, 'all levels satisfied → bottleneck = null');
  assert(r.summary.length > 0, 'summary is non-empty');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`MaslowSystem: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All MaslowSystem tests passed! ✅');
