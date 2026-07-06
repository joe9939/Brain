// Goal System Tests — §1.3A: 目标系统单元测试
// 测试目标的创建/完成/失败/状态转换

import { GoalSystem } from '../src/core/goal';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testDefaultState() {
  console.log('\n📋 Default State');
  const d = GoalSystem.default();
  assert(Array.isArray(d.active), 'active is array');
  assert(d.active.length === 0, 'no active goals');
  assert(d.completed === 0, 'completed = 0');
  assert(Array.isArray(d.history), 'history is array');
}

function testAddGoal() {
  console.log('\n➕ Add Goal');
  const gs = new GoalSystem();
  const state = GoalSystem.default();

  const g1 = gs.add(state, 'Learn TypeScript', 7);
  assert(g1.id.startsWith('g-'), 'goal id starts with g-');
  assert(g1.description === 'Learn TypeScript', 'description stored');
  assert(g1.status === 'active', 'new goal is active');
  assert(g1.priority === 7, 'priority stored');
  assert(typeof g1.created === 'number', 'created timestamp set');
  assert(state.active.length === 1, 'state has 1 active goal');

  const g2 = gs.add(state, 'Build a project', 3);
  assert(state.active.length === 2, 'second goal added');
  assert(g2.priority === 3, 'second goal priority stored');
}

function testCompleteGoal() {
  console.log('\n✅ Complete Goal');
  const gs = new GoalSystem();
  const state = GoalSystem.default();

  const g = gs.add(state, 'Finish testing', 5);
  assert(state.completed === 0, 'not completed yet');

  gs.complete(state, g.id);
  assert(state.completed === 1, 'completed count incremented');
  assert(state.active.length === 0, 'goal removed from active');
  assert(state.history.length === 1, 'goal added to history');
  assert(state.history[0].status === 'completed', 'history goal status is completed');
  assert(typeof state.history[0].completedAt === 'number', 'completedAt timestamp set');
}

function testFailGoal() {
  console.log('\n❌ Fail Goal');
  const gs = new GoalSystem();
  const state = GoalSystem.default();

  const g = gs.add(state, 'Impossible task', 10);
  assert(state.active.length === 1, 'goal added');

  gs.fail(state, g.id);
  assert(state.active.length === 0, 'failed goal removed from active');
  assert(state.completed === 0, 'completed not incremented (failed)');
}

function testCompleteNonExistent() {
  console.log('\n🔍 Complete Non-existent Goal');
  const gs = new GoalSystem();
  const state = GoalSystem.default();
  // Should not throw
  gs.complete(state, 'nonexistent-id');
  assert(state.completed === 0, 'state unchanged');
  assert(state.active.length === 0, 'no active goals');
}

function testFailNonExistent() {
  console.log('\n🔍 Fail Non-existent Goal');
  const gs = new GoalSystem();
  const state = GoalSystem.default();
  gs.fail(state, 'nonexistent-id');
  assert(state.completed === 0, 'state unchanged');
}

function testMultipleGoalsLifecycle() {
  console.log('\n🔄 Multiple Goals Lifecycle');
  const gs = new GoalSystem();
  const state = GoalSystem.default();

  const g1 = gs.add(state, 'Task A', 5);
  const g2 = gs.add(state, 'Task B', 3);
  const g3 = gs.add(state, 'Task C', 8);
  assert(state.active.length === 3, '3 goals added');

  gs.complete(state, g2.id);
  assert(state.active.length === 2, '2 remain after completing one');
  assert(state.completed === 1, '1 completed');

  gs.fail(state, g1.id);
  assert(state.active.length === 1, '1 remains after fail');
  assert(state.completed === 1, 'still 1 completed');

  gs.complete(state, g3.id);
  assert(state.active.length === 0, 'all done');
  assert(state.completed === 2, '2 completed total');
  assert(state.history.length === 2, '2 in history');
}

// ─── RUN ───
console.log('🧠 GOAL SYSTEM UNIT TESTS');
console.log('='.repeat(50));

testDefaultState();
testAddGoal();
testCompleteGoal();
testFailGoal();
testCompleteNonExistent();
testFailNonExistent();
testMultipleGoalsLifecycle();

console.log(`\n${'='.repeat(50)}`);
console.log(`Goal: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All goal tests passed! ✅');
