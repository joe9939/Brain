// Maslow + GoalManager 集成测试
// 验证: Maslow 瓶颈 → 中断/恢复目标 → 正确动作输出

import { MaslowSystem } from '../src/core/maslow-system';
import { GoalManager } from '../src/core/goal-manager';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const goodInventory = [
  { item: 'iron_pickaxe', count: 1 }, { item: 'iron_axe', count: 1 },
  { item: 'iron_sword', count: 1 }, { item: 'iron_shovel', count: 1 },
  { item: 'crafting_table', count: 1 }, { item: 'furnace', count: 1 },
  { item: 'chest', count: 1 }, { item: 'red_bed', count: 1 },
  { item: 'iron_helmet', count: 1 }, { item: 'iron_chestplate', count: 1 },
  { item: 'iron_leggings', count: 1 }, { item: 'iron_boots', count: 1 },
];

function makeSnapshot(overrides: Record<string, any> = {}): any {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20, healthDelta: 0, hunger: 20, oxygen: 20,
    onFire: false, inLava: false, falling: false,
    blocks: [], entities: [], inventory: [],
    timeOfDay: 6000, dimension: 'overworld',
    ...overrides,
  };
}

console.log('\n🔄 Maslow + GoalManager: tick flow');

// RED 1: All needs satisfied, has L4 goal → step executes
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();
  goals.set({ description: 'Build base', plan: ['collect_stone', 'build_walls'], maslowLevel: 4 });

  // Tick with full stats (include goodInventory so L4 is satisfied)
  const r = maslow.evaluate(makeSnapshot({ inventory: goodInventory }), { activeGoal: goals.active });
  assert(r.bottleneck === null, 'all needs satisfied → no bottleneck');

  // Not blocked, has current step → execute it
  const blocked = r.bottleneck !== null && goals.isBlockedBy(r.bottleneck);
  assert(blocked === false, 'L4 goal not blocked when no bottleneck');

  const action = blocked ? null : goals.currentStep;
  assert(action === 'collect_stone', 'step action = collect_stone');
})();

// RED 2: L1 hunger bottleneck → interrupts L4 goal
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();
  goals.set({ description: 'Build house', plan: ['get_wood', 'craft'], maslowLevel: 4 });

  // Tick with low hunger
  const r = maslow.evaluate(makeSnapshot({ hunger: 3 }), { activeGoal: goals.active });
  assert(r.bottleneck === 1, 'hungry → bottleneck = 1');

  // L1 bottleneck blocks L4 goal → interrupt
  if (r.bottleneck !== null && goals.isBlockedBy(r.bottleneck)) {
    goals.interrupt(r.bottleneck);
  }
  assert(goals.active === null, 'L4 goal interrupted by hunger');
  assert(goals.pending !== null, 'goal saved as pending');

  // Action should be survival, not build
  const action = goals.currentStep;
  assert(action === null, 'no active goal → no step action');
})();

// RED 3: After L1 resolved → resume L4 goal
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();

  // Give L4 tools so L4 is satisfied (avoid L4 bottleneck)
  const goodInventory = [
    { item: 'iron_pickaxe', count: 1 }, { item: 'iron_axe', count: 1 },
    { item: 'iron_sword', count: 1 }, { item: 'iron_shovel', count: 1 },
    { item: 'crafting_table', count: 1 }, { item: 'furnace', count: 1 },
    { item: 'chest', count: 1 }, { item: 'red_bed', count: 1 },
    { item: 'iron_helmet', count: 1 }, { item: 'iron_chestplate', count: 1 },
    { item: 'iron_leggings', count: 1 }, { item: 'iron_boots', count: 1 },
  ];

  // Start L4 goal
  goals.set({ description: 'Explore', plan: ['find_cave', 'enter'], maslowLevel: 4 });

  // L1 interrupt (hungry)
  const r1 = maslow.evaluate(makeSnapshot({ hunger: 2, inventory: goodInventory }), { activeGoal: goals.active });
  if (r1.bottleneck !== null && goals.isBlockedBy(r1.bottleneck)) {
    goals.interrupt(r1.bottleneck);
  }
  assert(goals.active === null, 'interrupted after hungry');

  // After eating (L1 resolved), L2-L5 also satisfied
  const r2 = maslow.evaluate(makeSnapshot({ hunger: 20, inventory: goodInventory }), { activeGoal: goals.pending });
  const stillBlocked = r2.bottleneck !== null && goals.isBlockedBy(r2.bottleneck);
  if (!stillBlocked && goals.pending) {
    goals.resume();
  }
  assert(goals.active !== null, 'goal resumed after hunger resolved');
  assert(goals.currentStep === 'find_cave', 'resumed at same step');
})();

// RED 4: No active goal → L5 bottleneck → need LLM to set a goal
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();

  const r = maslow.evaluate(makeSnapshot({ inventory: goodInventory }), { activeGoal: null });
  assert(r.bottleneck === 5, 'no active goal → L5 bottleneck');
  assert(goals.active === null, 'no active goal');
  assert(goals.currentStep === null, 'no step to execute');

  // L5 bottleneck means "need self-actualization → set a goal"
  const needsNewGoal = r.bottleneck === 5;
  assert(needsNewGoal === true, 'L5 bottleneck → need LLM to set a goal');
})();

// RED 5: L2 night danger interrupts L1 goal? No, L2 < L1, cannot interrupt
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();
  goals.set({ description: 'Eat', plan: ['find_food'], maslowLevel: 1 }); // L1

  // Night time
  const r = maslow.evaluate(makeSnapshot({ timeOfDay: 15000 }), { activeGoal: goals.active });
  assert(r.bottleneck === 2, 'night → L2 bottleneck');

  // L2 cannot interrupt L1 (2 > 1)
  assert(goals.isBlockedBy(r.bottleneck!) === false, 'L2 does not block L1 goal');

  // Goal continues
  assert(goals.currentStep === 'find_food', 'L1 goal continues despite L2 issue');
})();

// RED 6: Multiple steps → stepComplete advances + step action updates
(function() {
  const maslow = new MaslowSystem();
  const goals = new GoalManager();
  goals.set({ description: 'Farm', plan: ['hoe_land', 'plant_seeds', 'water'], maslowLevel: 4 });

  const tick = () => {
    const r = maslow.evaluate(makeSnapshot({ inventory: goodInventory }), { activeGoal: goals.active });
    if (r.bottleneck !== null && goals.isBlockedBy(r.bottleneck)) {
      goals.interrupt(r.bottleneck);
      return 'interrupted';
    }
    const action = goals.currentStep;
    if (action) {
      goals.stepComplete();
    }
    return action;
  };

  assert(tick() === 'hoe_land', 'step 1: hoe_land');
  assert(tick() === 'plant_seeds', 'step 2: plant_seeds');
  assert(tick() === 'water', 'step 3: water');
  // After last step, stepComplete returns false, but currentStep goes to next
  // 4th tick: all steps done
  goals.stepComplete();
  assert(goals.currentStep === null, 'after last step → no current step');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`Integration: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All integration tests passed! ✅');
