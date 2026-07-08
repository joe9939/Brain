// Minecraft Perceive Tests — Mineflayer → WorldSnapshot 映射
// RED: mc-perceive.ts 不存在

import { perceive, MinecraftPerceiver } from '../adapter/minecraft/mc-perceive';
import { WorldSnapshot } from '../brain-engine/src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ─── Mock Mineflayer bot ───
function makeMockBot(overrides: any = {}): any {
  return {
    entity: {
      position: { x: 0, y: 64, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      onGround: true,
      ...overrides.entity,
    },
    health: 20,
    food: 20,
    foodSaturation: 5,
    oxygenLevel: 20,
    isOnFire: false,
    isInLava: false,
    isSleeping: false,
    game: { dimension: 'overworld' },
    time: { timeOfDay: 1000, isDay: true },
    isRaining: false,
    inventory: { items: () => [] },
    entities: {},
    blockAt: () => null,
    nearestEntity: () => null,
    findBlocks: () => [],
    ...overrides,
  };
}

function testPerceiveExists() {
  console.log('\n🆕 perceive() Exists');
  assert(typeof perceive === 'function', 'perceive is a function');
}

function testBasicPosition() {
  console.log('\n📍 Position Mapping');
  const bot = makeMockBot({
    entity: { position: { x: 10.5, y: 65.0, z: -20.3 }, velocity: { x: 0, y: 0, z: 0 } },
  });
  const snap = perceive(bot);
  assert(snap.position.x === 10.5, 'x maps correctly');
  assert(snap.position.y === 65.0, 'y maps correctly');
  assert(snap.position.z === -20.3, 'z maps correctly');
}

function testVelocity() {
  console.log('\n🏃 Velocity Mapping');
  const bot = makeMockBot({
    entity: { position: { x: 0, y: 64, z: 0 }, velocity: { x: 0.5, y: 0.2, z: -0.3 } },
  });
  const snap = perceive(bot);
  assert(snap.velocity.x === 0.5, 'vx maps');
  assert(snap.velocity.y === 0.2, 'vy maps');
  assert(snap.velocity.z === -0.3, 'vz maps');
}

function testHealthHunger() {
  console.log('\n❤️ Health and Hunger');
  const bot = makeMockBot({ health: 12, food: 8 });
  const snap = perceive(bot);
  assert(snap.health === 12, 'health maps');
  assert(snap.hunger === 8, 'hunger maps');
}

function testFireDetection() {
  console.log('\n🔥 Fire and Lava Detection');
  const fireBot = makeMockBot({ isOnFire: true });
  assert(perceive(fireBot).onFire === true, 'onFire=true when bot is on fire');

  const lavaBot = makeMockBot({ isInLava: true });
  assert(perceive(lavaBot).inLava === true, 'inLava=true when bot in lava');
}

function testOxygen() {
  console.log('\n🫧 Oxygen Level');
  const drowning = makeMockBot({ oxygenLevel: 5 });
  assert(perceive(drowning).oxygen === 5, 'oxygen maps');
}

function testDimension() {
  console.log('\n🌍 Dimension');
  const nether = makeMockBot({ game: { dimension: 'the_nether' } });
  assert(perceive(nether).dimension === 'the_nether', 'dimension maps');
}

function testTimeOfDay() {
  console.log('\n🌞 Time of Day');
  const bot = makeMockBot({ time: { timeOfDay: 18000, isDay: false } });
  assert(perceive(bot).timeOfDay === 18000, 'timeOfDay maps');
}

function testInventoryMapping() {
  console.log('\n📦 Inventory');
  const bot = makeMockBot({
    inventory: {
      items: () => [
        { name: 'dirt', count: 32 },
        { name: 'cobblestone', count: 64 },
        { name: 'iron_pickaxe', count: 1 },
      ],
    },
  });
  const snap = perceive(bot);
  assert(snap.inventory.length === 3, 'inventory has 3 items');
  assert(snap.inventory[0].item === 'dirt', 'item name maps');
  assert(snap.inventory[0].count === 32, 'item count maps');
}

function testEmptyInventory() {
  console.log('\n📭 Empty Inventory');
  const bot = makeMockBot();
  const snap = perceive(bot);
  assert(Array.isArray(snap.inventory), 'inventory is array');
  assert(snap.inventory.length === 0, 'empty inventory');
}

function testBlocksAround() {
  console.log('\n🧱 Blocks Around');
  const bot = makeMockBot({
    findBlocks: () => [{ x: 0, y: 63, z: 0 }, { x: 1, y: 63, z: 0 }],
    blockAt: (pos: any) => ({ name: 'stone', position: pos }),
  });
  // By default blockAt returns null, so blocks should be empty
  const snap = perceive(bot);
  assert(Array.isArray(snap.blocks), 'blocks is array');
}

function testEntitiesMapping() {
  console.log('\n👾 Entities');
  const bot = makeMockBot({
    entities: {
      '1': { type: 'zombie', position: { x: 5, y: 64, z: 5 }, velocity: { x: 0, y: 0, z: 0 }, name: 'Zombie' },
      '2': { type: 'cow', position: { x: 10, y: 64, z: -5 }, velocity: { x: 0, y: 0, z: 0 }, name: 'Cow' },
    },
  });
  const snap = perceive(bot);
  assert(snap.entities.length === 2, '2 entities mapped');
  assert(snap.entities[0].type === 'zombie', 'entity type maps');
}

// ─── HealthDelta Tests ───

function testHealthDeltaFirstCallZero() {
  console.log('\n🆕 HealthDelta — First call = 0');
  const p = new MinecraftPerceiver();
  const bot = makeMockBot({ health: 20 });
  const snap = p.perceive(bot);
  assert(snap.healthDelta === 0, 'first perceive has delta 0');
}

function testHealthDeltaTracksChanges() {
  console.log('\n📉 HealthDelta — Tracks decreases');
  const p = new MinecraftPerceiver();
  p.perceive(makeMockBot({ health: 20 }));
  const snap = p.perceive(makeMockBot({ health: 14 }));
  assert(snap.healthDelta === -6, 'healthDelta = -6 after damage');
  assert(snap.health === 14, 'current health is 14');
}

function testHealthDeltaMultipleCalls() {
  console.log('\n📈 HealthDelta — Multiple calls accumulate');
  const p = new MinecraftPerceiver();
  p.perceive(makeMockBot({ health: 20 }));
  p.perceive(makeMockBot({ health: 15 }));
  const snap = p.perceive(makeMockBot({ health: 18 }));
  assert(snap.healthDelta === 3, 'healing: healthDelta = +3');
}

function testHealthDeltaReset() {
  console.log('\n🔄 HealthDelta — Reset() clears history');
  const p = new MinecraftPerceiver();
  p.perceive(makeMockBot({ health: 20 }));
  p.reset();
  const snap = p.perceive(makeMockBot({ health: 5 }));
  assert(snap.healthDelta === 0, 'after reset, delta = 0 again');
}

function testHealthDeltaWithClass() {
  console.log('\n🏗️ MinecraftPerceiver class');
  const p = new MinecraftPerceiver();
  assert(typeof p.perceive === 'function', 'has perceive method');
  assert(typeof p.reset === 'function', 'has reset method');
}

// ─── RUN ───
console.log('🧠 MC PERCEIVE TESTS');
console.log('='.repeat(50));

testPerceiveExists();
testBasicPosition();
testVelocity();
testHealthHunger();
testFireDetection();
testOxygen();
testDimension();
testTimeOfDay();
testInventoryMapping();
testEmptyInventory();
testBlocksAround();
testEntitiesMapping();
testHealthDeltaFirstCallZero();
testHealthDeltaTracksChanges();
testHealthDeltaMultipleCalls();
testHealthDeltaReset();
testHealthDeltaWithClass();

console.log(`\n${'='.repeat(50)}`);
console.log(`Perceive: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All perceive tests passed! ✅');
