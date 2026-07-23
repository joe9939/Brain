// GoalManager — 目标管理 (替换旧的 GoalSystem)
// TDD: plan + step + interrupt + resume

import { GoalManager } from '../src/core/goal-manager';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

console.log('\n🎯 GoalManager: set / clear');

// RED 1: Set a goal with plan steps
(function() {
  const gm = new GoalManager();
  gm.set({
    description: 'Build a house',
    plan: ['get_wood', 'craft_planks', 'build_walls', 'place_roof'],
  });
  assert(gm.active !== null, 'goal is set');
  assert(gm.active!.plan.length === 4, 'plan has 4 steps');
  assert(gm.currentStep === 'get_wood', 'first step is get_wood');
  assert(gm.active!.progress === 0, 'progress starts at 0');
})();

// RED 2: Clear goal
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Test', plan: ['step1'] });
  assert(gm.active !== null, 'goal exists');
  gm.clear();
  assert(gm.active === null, 'goal cleared');
})();

console.log('\n🎯 GoalManager: step execution');

// RED 3: Step complete → advances to next step
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Mine', plan: ['get_pickaxe', 'find_coal', 'mine_coal'] });
  assert(gm.stepComplete() === true, 'after step 1, more steps remain');
  assert(gm.currentStep === 'find_coal', 'step 2 is find_coal');
  assert(gm.active!.progress === 1 / 3, 'progress = 1/3');

  gm.stepComplete();
  assert(gm.currentStep === 'mine_coal', 'step 3 is mine_coal');
  assert(gm.active!.progress === 2 / 3, 'progress = 2/3');
})();

// RED 4: Last step complete → returns false (goal done)
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Done', plan: ['only_step'] });
  assert(gm.stepComplete() === false, 'last step → false, no more steps');
  // Goal should still be active (clear() to remove)
  assert(gm.active !== null, 'goal still active until clear()');
})();

// RED 5: No active goal → stepComplete returns false
(function() {
  const gm = new GoalManager();
  assert(gm.stepComplete() === false, 'no active goal → false');
})();

console.log('\n🎯 GoalManager: interrupt / resume');

// RED 6: Interrupt with higher priority → suspends current goal
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Build castle', plan: ['step1', 'step2'], maslowLevel: 4 });
  const interrupted = gm.interrupt(1); // L1 emergency
  assert(interrupted === true, 'L1 interrupts L4 goal');
  assert(gm.active === null, 'current goal cleared after interrupt');
  assert(gm.pending !== null, 'pending goal saved');
  assert(gm.pending!.description === 'Build castle', 'pending keeps original goal');
})();

// RED 7: Lower priority does NOT interrupt higher
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Eat', plan: ['find_food'], maslowLevel: 1 });
  const interrupted = gm.interrupt(4); // L4 cannot interrupt L1
  assert(interrupted === false, 'L4 does not interrupt L1');
  assert(gm.active!.description === 'Eat', 'L1 goal remains');
})();

// RED 8: Resume after interrupt
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Explore cave', plan: ['find_cave', 'enter'], maslowLevel: 3 });
  gm.interrupt(1); // L1 emergency → suspend
  assert(gm.active === null, 'suspended during L1');
  gm.resume();
  assert(gm.active !== null, 'resumed after L1 resolved');
  assert(gm.active!.description === 'Explore cave', 'resumed goal matches');
  assert(gm.currentStep === 'find_cave', 'resumed at same step');
})();

// RED 9: Resume with no pending → no-op
(function() {
  const gm = new GoalManager();
  gm.resume();
  assert(gm.active === null, 'resume with no pending → no change');
})();

console.log('\n🎯 GoalManager: state check');

// RED 10: Is bottleneck blocking current goal?
(function() {
  const gm = new GoalManager();
  gm.set({ description: 'Build', plan: ['step1'], maslowLevel: 4 });
  // If bottleneck=1 (hungry), level 4 goal should be blocked
  assert(gm.isBlockedBy(1) === true, 'L4 goal blocked by L1 bottleneck');
  assert(gm.isBlockedBy(4) === false, 'L4 goal not blocked by L4 bottleneck');
  assert(gm.isBlockedBy(5) === false, 'L4 goal not blocked by L5 bottleneck');
})();

// RED 11: No active goal → not blocked
(function() {
  const gm = new GoalManager();
  assert(gm.isBlockedBy(1) === false, 'no goal → not blocked');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`GoalManager: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All GoalManager tests passed! ✅');
