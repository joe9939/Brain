// Reflex Arc Tests — 生存反射单元测试
// RED: SurvivalReflex 不存在
// GREEN: 创建最小实现

import { SurvivalReflex, ReflexRegistry } from '../src/core/reflex-arc';
import { WorldSnapshot, ReflexHandler } from '../src/core/types';

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
    blocks: [], entities: [], inventory: [],
    timeOfDay: 1000, dimension: 'overworld',
    ...overrides,
  };
}

function testSurvivalReflexExists() {
  console.log('\n🆕 SurvivalReflex Exists');
  const r = new SurvivalReflex();
  assert(r.name === 'minecraft-survival', 'name is minecraft-survival');
  assert(typeof r.priority === 'number', 'has priority number');
  assert(typeof r.check === 'function', 'has check function');
}

function testFireDetection() {
  console.log('\n🔥 Fire Detection — Reflex: move to water');
  const r = new SurvivalReflex();
  
  const onFire = makeSnapshot({ onFire: true });
  const result = r.check(onFire);
  assert(result !== null, 'fire triggers reflex');
  assert(result!.action === 'move_to_water', 'fire → move_to_water');
  assert(result!.priority === 0, 'fire reflex has priority 0');
}

function testLowHealth() {
  console.log('\n❤️ Low Health — Reflex: eat food');
  const r = new SurvivalReflex();
  
  const lowHp = makeSnapshot({ health: 4 });
  const result = r.check(lowHp);
  assert(result !== null, 'low health triggers reflex');
  assert(result!.action === 'eat_food', 'health < 5 → eat_food');
}

function testVoidFall() {
  console.log('\n🕳️ Void Fall — Reflex: place block below');
  const r = new SurvivalReflex();
  
  const falling = makeSnapshot({ position: { x: 0, y: -20, z: 0 }, falling: true });
  const result = r.check(falling);
  assert(result !== null, 'void fall triggers reflex');
  assert(result!.action === 'place_block', 'y < -10 → place_block');
}

function testDrowning() {
  console.log('\n🫧 Drowning — Reflex: move to surface');
  const r = new SurvivalReflex();
  
  const drowning = makeSnapshot({ oxygen: 3 });
  const result = r.check(drowning);
  assert(result !== null, 'low oxygen triggers reflex');
  assert(result!.action === 'move_to_surface', 'oxygen < 5 → move_to_surface');
}

function testNoActionOnSafeState() {
  console.log('\n✅ Safe State — No reflex needed');
  const r = new SurvivalReflex();
  
  const safe = makeSnapshot();
  const result = r.check(safe);
  assert(result === null, 'safe state → no reflex');
}

function testHigherPriorityWins() {
  console.log('\n🏆 Priority Order — Fire > Hunger');
  const r = new SurvivalReflex();
  
  // On fire AND hungry — fire should win (priority 0 vs 3)
  const onFireAndHungry = makeSnapshot({ onFire: true, hunger: 2, health: 20 });
  const result = r.check(onFireAndHungry);
  assert(result!.action === 'move_to_water', 'fire priority > hunger priority');
}

// ─── ReflexRegistry Tests ───

function testRegistryRegister() {
  console.log('\n📋 ReflexRegistry — Register Handlers');
  const reg = new ReflexRegistry();
  assert(reg.count() === 0, 'empty registry has 0 handlers');
  
  reg.register(new SurvivalReflex());
  assert(reg.count() === 1, 'after register, 1 handler');
}

function testRegistryPriorityOrder() {
  console.log('\n📋 ReflexRegistry — Priority Order');
  const reg = new ReflexRegistry();
  
  const low: ReflexHandler = { name: 'low', priority: 10, check: () => ({ priority: 10, action: 'low' }) };
  const high: ReflexHandler = { name: 'high', priority: 1, check: () => ({ priority: 1, action: 'high' }) };
  
  reg.register(low);
  reg.register(high);
  
  const result = reg.check(makeSnapshot());
  assert(result !== null, 'some reflex fires');
  assert(result!.action === 'high', 'higher priority (lower number) runs first');
}

function testRegistryNoMatch() {
  console.log('\n📋 ReflexRegistry — No Match Returns Null');
  const reg = new ReflexRegistry();
  
  const result = reg.check(makeSnapshot());
  assert(result === null, 'empty registry returns null');
}

function testRegistryClear() {
  console.log('\n📋 ReflexRegistry — Clear');
  const reg = new ReflexRegistry();
  reg.register(new SurvivalReflex());
  reg.clear();
  assert(reg.count() === 0, 'clear removes all handlers');
}

// ─── RUN ───
console.log('🧠 REFLEX ARC TESTS');
console.log('='.repeat(50));

testSurvivalReflexExists();
testFireDetection();
testLowHealth();
testVoidFall();
testDrowning();
testNoActionOnSafeState();
testHigherPriorityWins();
testRegistryRegister();
testRegistryPriorityOrder();
testRegistryNoMatch();
testRegistryClear();

console.log(`\n${'='.repeat(50)}`);
console.log(`ReflexArc: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All reflex arc tests passed! ✅');
