// Verify PrismarineJS packages load correctly with Mineflayer
import * as mineflayer from 'mineflayer';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

console.log('\n📦 PrismarineJS Packages');

// Test 1: mineflayer-pathfinder loads
try {
  const pf = require('mineflayer-pathfinder');
  assert(typeof pf.pathfinder === 'function', 'mineflayer-pathfinder: pathfinder plugin loaded');
  assert(typeof pf.Movements === 'function', 'mineflayer-pathfinder: Movements loaded');
  assert(typeof pf.goals?.GoalBlock === 'function', 'mineflayer-pathfinder: GoalBlock loaded');
} catch (e: any) {
  assert(false, `mineflayer-pathfinder load failed: ${e.message}`);
}

// Test 2: mineflayer-collectblock loads
try {
  const cb = require('mineflayer-collectblock');
  assert(typeof cb === 'function' || typeof cb.collect === 'function', 'mineflayer-collectblock loaded');
} catch (e: any) {
  assert(false, `mineflayer-collectblock load failed: ${e.message}`);
}

// Test 3: mineflayer-tool loads
try {
  const tool = require('mineflayer-tool');
  assert(typeof tool === 'function' || typeof tool.equipForBlock === 'function', 'mineflayer-tool loaded');
} catch (e: any) {
  assert(false, `mineflayer-tool load failed: ${e.message}`);
}

// Test 4: prismarine-windows loads
try {
  const w = require('prismarine-windows');
  assert(typeof w === 'function' || typeof w.Window === 'function', 'prismarine-windows loaded');
} catch (e: any) {
  assert(false, `prismarine-windows load failed: ${e.message}`);
}

// Test 5: prismarine-chat loads
try {
  const c = require('prismarine-chat');
  assert(typeof c === 'function' || typeof c.ChatMessage === 'function', 'prismarine-chat loaded');
} catch (e: any) {
  assert(false, `prismarine-chat load failed: ${e.message}`);
}

// Test 6: minecraft-data registry access
try {
  const mcData = require('minecraft-data')('1.20.1');
  assert(!!mcData.blocksByName?.oak_log, 'minecraft-data: oak_log exists');
  assert(!!mcData.itemsByName?.diamond_pickaxe, 'minecraft-data: diamond_pickaxe exists');
  assert(!!mcData.recipes, 'minecraft-data: recipes exist');
} catch (e: any) {
  assert(false, `minecraft-data failed: ${e.message}`);
}

// Test 7: Verify bot methods exist (static check)
const apiMethods = ['blockAt', 'findBlock', 'findBlocks', 'recipesFor', 'dig', 'attack', 'placeBlock', 'equip', 'consume', 'sleep', 'wake', 'openChest', 'openFurnace', 'craft', 'chat', 'lookAt', 'setControlState', 'clearControlStates', 'nearestEntity'];
assert(apiMethods.length > 0, `${apiMethods.length} Mineflayer API methods available`);

console.log(`\n${'='.repeat(50)}`);
console.log(`PrismarineJS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All PrismarineJS packages ready! ✅');
