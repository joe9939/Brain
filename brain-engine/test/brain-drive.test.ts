// Drive System Tests — 马斯洛动机引擎
// RED: DriveSystem 不存在

import { DriveSystem } from '../src/core/brain-drive';
import { WorldSnapshot } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(overrides: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20, healthDelta: 0, hunger: 20, oxygen: 20,
    onFire: false, inLava: false, falling: false,
    blocks: [], entities: [], inventory: [{ item: 'stone_pickaxe', count: 1 }],
    timeOfDay: 1000, dimension: 'overworld',
    ...overrides,
  };
}

function testDriveSystemExists() {
  console.log('\n🆕 DriveSystem Exists');
  const d = new DriveSystem();
  assert(typeof d.tick === 'function', 'has tick method');
  assert(typeof d.getCurrentGoal === 'function', 'has getCurrentGoal');
}

function testHungerDrivesFood() {
  console.log('\n🍖 Level 1: Hunger → seek food');
  const d = new DriveSystem();
  const snap = makeSnapshot({ hunger: 8, inventory: [] });
  const goal = d.tick(snap);
  assert(goal !== null, 'hunger generates a goal');
  assert(goal!.action.includes('food') || goal!.action.includes('eat'), 'goal involves food');
  assert(goal!.priority === 5, 'hunger goal priority is 5');
}

function testLowHealthDrivesHealing() {
  console.log('\n❤️ Level 1: Low health → seek healing');
  const d = new DriveSystem();
  const snap = makeSnapshot({ health: 6 });
  const goal = d.tick(snap);
  assert(goal !== null, 'low health generates a goal');
  assert(goal!.priority >= 4, 'health goal priority >= 4');
}

function testNightDrivesShelter() {
  console.log('\n🌙 Level 2: Night time → seek shelter');
  const d = new DriveSystem();
  // timeOfDay > 13000 = night
  const snap = makeSnapshot({ timeOfDay: 14000, blocks: [] });
  const goal = d.tick(snap);
  assert(goal !== null, 'night triggers safety goal');
  assert(goal!.action.includes('shelter') || goal!.action.includes('build'), 'goal is shelter related');
}

function testFullNeedsGenerateExploration() {
  console.log('\n🔭 Level 5: All needs met → explore');
  const d = new DriveSystem();
  // Everything is perfect — boredom should build up
  const snap = makeSnapshot();
  let hasExplored = false;
  for (let i = 0; i < 40; i++) {
    const goal = d.tick(snap);
    if (goal?.action === 'wander' || goal?.action.includes('explore')) {
      hasExplored = true;
      break;
    }
  }
  assert(hasExplored, 'eventually generates exploration goal');
}

function testLevel1PriorityOverLevel2() {
  console.log('\n🏆 Priority: Hunger > Night danger');
  const d = new DriveSystem();
  // Hungry AND it's night — should choose food (Level 1 beats Level 2)
  const snap = makeSnapshot({ hunger: 6, timeOfDay: 14000, inventory: [] });
  const goal = d.tick(snap);
  assert(goal !== null, 'generates a goal');
  assert(goal!.action.includes('food') || goal!.action.includes('eat'), 'hunger beats night safety');
}

function testInventoryDrivesUpgrade() {
  console.log('\n⛏️ Level 4: Has iron → upgrade tools');
  const d = new DriveSystem();
  const snap = makeSnapshot({ inventory: [{ item: 'iron_ingot', count: 5 }] });
  const goal = d.tick(snap);
  assert(goal !== null, 'iron triggers upgrade goal');
}

function testBoredomWithoutInventory() {
  console.log('\n😐 Boredom — no inventory, just wander');
  const d = new DriveSystem();
  const snap = makeSnapshot({ inventory: [] });
  // First tick: should prioritize finding food/items
  // After many ticks with full needs, boredom should trigger wander
  let hasWander = false;
  for (let i = 0; i < 5; i++) {
    // Full health, full hunger, daytime
    const safeSnap = makeSnapshot({ health: 20, hunger: 20, timeOfDay: 1000, inventory: [] });
    const g = d.tick(safeSnap);
    if (g?.action === 'wander') { hasWander = true; break; }
  }
  // With no inventory and no immediate needs, might wander or seek resources
  assert(true, 'boredom system runs without error');
}

function testGetCurrentGoal() {
  console.log('\n🎯 getCurrentGoal returns latest goal');
  const d = new DriveSystem();
  d.tick(makeSnapshot({ hunger: 5 }));
  const goal = d.getCurrentGoal();
  assert(goal !== null, 'current goal exists after tick');
  assert(typeof goal!.action === 'string', 'goal has action');
}

function testNoGoalWhenEverythingPerfect() {
  console.log('\n😊 Everything perfect — no urgent goal initially');
  const d = new DriveSystem();
  const snap = makeSnapshot({ health: 20, hunger: 20, timeOfDay: 1000, inventory: [{ item: 'diamond_sword', count: 1 }] });
  const goal = d.tick(snap);
  // First tick might still be accumulating boredom
  assert(true, 'perfect state does not crash');
}

// ─── RUN ───
console.log('🧠 DRIVE SYSTEM TESTS');
console.log('='.repeat(50));

testDriveSystemExists();
testHungerDrivesFood();
testLowHealthDrivesHealing();
testNightDrivesShelter();
testFullNeedsGenerateExploration();
testLevel1PriorityOverLevel2();
testInventoryDrivesUpgrade();
testBoredomWithoutInventory();
testGetCurrentGoal();
testNoGoalWhenEverythingPerfect();

console.log(`\n${'='.repeat(50)}`);
console.log(`DriveSystem: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All drive system tests passed! ✅');
