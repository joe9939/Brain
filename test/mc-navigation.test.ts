// Minecraft Navigation Tests — 边缘检测 + 卡住恢复
// TDD: 让bot像真人一样行动
import { isSafeAhead, findEscape, StuckDetector } from '../adapter/minecraft/mc-navigation';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeMockBot(pos: { x: number; y: number; z: number } = { x: 0, y: 64, z: 0 }): any {
  const blocks = new Map<string, any>();
  // Default: solid ground everywhere
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      // Solid ground at y=63 (one below bot's feet at 64)
      blocks.set(`${dx},63,${dz}`, { name: 'stone', boundingBox: 'block' });
      // Air at bot level and above
      for (let dy = 64; dy <= 70; dy++) {
        blocks.set(`${dx},${dy},${dz}`, { name: 'air', boundingBox: 'empty' });
      }
    }
  }

  let yaw = 0; // facing south (positive Z)
  return {
    entity: {
      position: { ...pos },
      yaw,
    },
    blockAt(p: { x: number; y: number; z: number }, extra?: boolean) {
      const key = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
      const b = blocks.get(key);
      if (b) return b;
      // Unknown block = assume air (unloaded chunks)
      return { name: 'air', boundingBox: 'empty' };
    },
    _setBlock(x: number, y: number, z: number, block: any) {
      blocks.set(`${x},${y},${z}`, block);
    },
  };
}

console.log('\n🧭 Navigation: isSafeAhead');

// RED 1: Safe ground ahead → return true
(function() {
  const bot = makeMockBot(); // standing at (0,64,0), ground at (0,63,0)
  // Front at (0,64,1) is air, ground at (0,63,1) is stone → safe
  const result = isSafeAhead(bot);
  assert(result === true, 'solid ground ahead → safe');
})();

// RED 2: Cliff ahead (no ground in front) → return false
(function() {
  const bot = makeMockBot();
  // Remove ground at (0,63,1) — air below the forward block → cliff!
  bot._setBlock(0, 63, 1, { name: 'air', boundingBox: 'empty' });
  const result = isSafeAhead(bot);
  assert(result === false, 'cliff ahead (air below front) → unsafe');
})();

// RED 3: Wall ahead → return false
(function() {
  const bot = makeMockBot();
  // Solid block right in front at (0,64,1)
  bot._setBlock(0, 64, 1, { name: 'stone', boundingBox: 'block' });
  const result = isSafeAhead(bot);
  assert(result === false, 'wall ahead → unsafe');
})();

// RED 4: Water ahead but solid below → return false (don't swim)
(function() {
  const bot = makeMockBot();
  bot._setBlock(0, 64, 1, { name: 'water', boundingBox: 'empty' });
  bot._setBlock(0, 63, 1, { name: 'stone', boundingBox: 'block' });
  const result = isSafeAhead(bot);
  assert(result === false, 'water ahead → unsafe (avoid drowning)');
})();

// RED 5: Bot facing east (yaw=-90°) checks correct block
(function() {
  const bot = makeMockBot();
  bot.entity.yaw = -Math.PI / 2; // facing east (positive X) — MC yaw: -pi/2 = east
  bot._setBlock(1, 63, 0, { name: 'air', boundingBox: 'empty' }); // no ground east
  const result = isSafeAhead(bot);
  assert(result === false, 'facing east, cliff east → unsafe');
})();

// RED 5b: Bot facing west checks correct block
(function() {
  const bot = makeMockBot();
  bot.entity.yaw = Math.PI / 2; // facing west (negative X)
  bot._setBlock(-1, 63, 0, { name: 'air', boundingBox: 'empty' }); // no ground west
  const result = isSafeAhead(bot);
  assert(result === false, 'facing west, cliff west → unsafe');
})();

console.log('\n🧭 Navigation: findEscape');

// RED 6: findEscape returns a valid clear direction when one exists
(function() {
  const bot = makeMockBot();
  // Block south (z+1) and north (z-1) and east (x+1) — only west is clear
  bot._setBlock(0, 64, 1, { name: 'stone', boundingBox: 'block' });
  bot._setBlock(0, 63, 1, { name: 'stone', boundingBox: 'block' }); // ground exists but block blocks
  bot._setBlock(0, 64, -1, { name: 'stone', boundingBox: 'block' });
  bot._setBlock(0, 63, -1, { name: 'stone', boundingBox: 'block' });
  bot._setBlock(1, 64, 0, { name: 'stone', boundingBox: 'block' });
  bot._setBlock(1, 63, 0, { name: 'stone', boundingBox: 'block' });
  // West (-1, 64, 0) is clear: air above, ground below
  const dir = findEscape(bot);
  assert(dir === 'west', 'only west is clear → escape west');
})();

// RED 7: findEscape returns null when surrounded on all sides
(function() {
  const bot = makeMockBot();
  // Block all 4 directions
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    bot._setBlock(0+dx, 64, 0+dz, { name: 'stone', boundingBox: 'block' });
  }
  const dir = findEscape(bot);
  assert(dir === null, 'surrounded on all sides → null');
})();

console.log('\n🧭 Navigation: StuckDetector');

// RED 7: StuckDetector detects no movement
(function() {
  const sd = new StuckDetector();
  const bot = makeMockBot({ x: 0, y: 64, z: 0 });
  for (let i = 0; i < 15; i++) {
    if (sd.tick(bot)) {
      assert(true, 'stuck after 10+ ticks of no movement');
      return;
    }
  }
  assert(false, 'should detect stuck after 10+ ticks');
})();

// RED 8: StuckDetector resets after movement
(function() {
  const sd = new StuckDetector();
  const bot = makeMockBot({ x: 0, y: 64, z: 0 });
  for (let i = 0; i < 8; i++) sd.tick(bot); // almost stuck
  bot.entity.position.x = 5; // moved!
  // After movement, should not trigger
  for (let i = 0; i < 5; i++) {
    if (sd.tick(bot)) {
      assert(false, 'should not be stuck after moving');
      return;
    }
  }
  assert(true, 'moved → not stuck');
})();

// RED 9: StuckDetector triggers after X ticks threshold
(function() {
  const sd = new StuckDetector();
  sd.setThreshold(5);
  const bot = makeMockBot({ x: 0, y: 64, z: 0 });
  let triggered = false;
  for (let i = 0; i < 20; i++) {
    if (sd.tick(bot)) { triggered = true; break; }
  }
  assert(triggered, 'stuck detector triggers with custom threshold');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`Navigation: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All navigation tests passed! ✅');
