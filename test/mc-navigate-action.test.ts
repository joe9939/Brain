// NavigationArc — 脑→动作之间的导航中间层
// TDD: 边缘检测 + 卡住恢复, 干净分层

import { NavigationArc, DIR_YAW } from '../adapter/minecraft/mc-navigate-action';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeMockBot(pos = { x: 0, y: 64, z: 0 }): any {
  const blocks = new Map<string, any>();
  // Default ground at y=63, air above
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      blocks.set(`${dx},63,${dz}`, { name: 'stone', boundingBox: 'block' });
      for (let dy = 64; dy <= 70; dy++) {
        blocks.set(`${dx},${dy},${dz}`, { name: 'air', boundingBox: 'empty' });
      }
    }
  }

  let _yaw = 0; // facing south
  let _jump = false;
  const lastLookCalls: Array<{ yaw: number; pitch: number }> = [];

  return {
    entity: {
      position: { ...pos },
      get yaw() { return _yaw; },
      set yaw(v: number) { _yaw = v; },
    },
    blockAt(p: { x: number; y: number; z: number }) {
      const key = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
      return blocks.get(key) ?? { name: 'air', boundingBox: 'empty' };
    },
    look(yaw: number, pitch: number, force: boolean) {
      _yaw = yaw;
      lastLookCalls.push({ yaw, pitch });
    },
    setControlState(control: string, state: boolean) {
      if (control === 'jump') _jump = state;
    },
    getControlState() { return false; },
    clearControlStates() {},
    _setBlock(x: number, y: number, z: number, block: any) {
      blocks.set(`${x},${y},${z}`, block);
    },
    _getYaw() { return _yaw; },
    _getJump() { return _jump; },
    _lastLookCalls: lastLookCalls,
  };
}

console.log('\n🧭 NavigationArc: edge detection');

// RED 1: wander + safe ahead → action unchanged
(function() {
  const bot = makeMockBot();
  const nav = new NavigationArc();
  const result = nav.drive(bot, { action: 'wander' });
  assert(result.action === 'wander', 'wander + safe ahead → action unchanged');
  assert(bot._getYaw() === 0, 'wander + safe ahead → yaw unchanged');
})();

// RED 2: wander + cliff south → bot rotates to safe direction
(function() {
  const bot = makeMockBot();
  // Remove ground at (0,63,1) → cliff south
  bot._setBlock(0, 63, 1, { name: 'air', boundingBox: 'empty' });
  const nav = new NavigationArc();
  const result = nav.drive(bot, { action: 'wander' });
  // Should rotate away from south — yaw should no longer be 0
  assert(result.action === 'wander', 'wander + cliff → action still wander (rotation handles safety)');
  assert(bot._getYaw() !== 0, 'wander + cliff → yaw changed from 0');
})();

// RED 3: wander + wall north (yaw=π) → bot rotates to safe direction
(function() {
  const bot = makeMockBot();
  bot.entity.yaw = Math.PI; // facing north
  bot._setBlock(0, 64, -1, { name: 'stone', boundingBox: 'block' }); // wall north
  const nav = new NavigationArc();
  nav.drive(bot, { action: 'wander' });
  assert(bot._getYaw() !== Math.PI, 'wander + wall north → yaw changed from PI');
})();

// RED 4: wander + surrounded → action becomes jump
(function() {
  const bot = makeMockBot();
  // Block all 4 directions (both the space and the ground below)
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    bot._setBlock(0+dx, 64, 0+dz, { name: 'stone', boundingBox: 'block' });
    bot._setBlock(0+dx, 63, 0+dz, { name: 'stone', boundingBox: 'block' });
  }
  const nav = new NavigationArc();
  const result = nav.drive(bot, { action: 'wander' });
  assert(result.action === 'jump', 'wander + surrounded → action becomes jump');
})();

// RED 5: non-wander action passes through unchanged
(function() {
  const bot = makeMockBot();
  const nav = new NavigationArc();
  const result = nav.drive(bot, { action: 'dig' });
  assert(result.action === 'dig', 'dig action passes through unchanged');
})();

console.log('\n🧭 NavigationArc: stuck detection');

// RED 6: stuck for threshold+ ticks → calls bot.look() to rotate
(function() {
  const bot = makeMockBot();
  let lookCount = 0;
  bot.look = () => { lookCount++; };
  const nav = new NavigationArc(10); // threshold = 10
  // First 10 ticks: stuckTicks goes 0→9, no trigger yet
  for (let i = 0; i < 10; i++) {
    const result = nav.drive(bot, { action: 'wander' });
    if (result.action === 'jump') {
      assert(false, 'should not jump from stuck (escape available)');
      return;
    }
  }
  // After 10 idle ticks, stuckTicks=9 (<10). No trigger yet.
  assert(lookCount === 0, 'no stuck rotation at tick 9 (not yet threshold)');
  // One more tick → stuckTicks = 10 → triggers
  nav.drive(bot, { action: 'wander' });
  assert(lookCount === 1, 'stuck triggers bot.look() at tick 10');
})();

// RED 7: stuck + surrounded → action becomes jump
(function() {
  const bot = makeMockBot();
  // Block all 4 directions
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    bot._setBlock(0+dx, 64, 0+dz, { name: 'stone', boundingBox: 'block' });
    bot._setBlock(0+dx, 63, 0+dz, { name: 'stone', boundingBox: 'block' });
  }
  const nav = new NavigationArc(5);
  let jumped = false;
  for (let i = 0; i < 12; i++) {
    const result = nav.drive(bot, { action: 'wander' });
    if (result.action === 'jump') { jumped = true; break; }
  }
  assert(jumped, 'stuck + surrounded → action becomes jump');
})();

// RED 8: moving resets stuck counter
(function() {
  const bot = makeMockBot();
  let lookCount = 0;
  bot.look = () => { lookCount++; }; // override: just count calls
  const nav = new NavigationArc(5);
  const initialYaw = bot.entity.yaw;

  // First 3 ticks: safe world, no edge triggers, no stuck yet
  for (let i = 0; i < 3; i++) nav.drive(bot, { action: 'wander' });
  assert(lookCount === 0, 'no edge or stuck in first 3 ticks');

  // 4 more ticks → at tick 5/7, stuckTicks reaches threshold=5 → triggers
  for (let i = 0; i < 4; i++) nav.drive(bot, { action: 'wander' });
  assert(lookCount === 1, 'stuck triggered after ~5 idle ticks');

  // Move within mock world bounds (-4..4)
  bot.entity.position.z = 2;
  // Counter reset. Next 3 ticks should NOT trigger stuck.
  for (let i = 0; i < 3; i++) nav.drive(bot, { action: 'wander' });
  assert(lookCount === 1, 'no extra look after movement (counter reset)');

  // After 5+ more idle ticks at new position, stuck triggers again
  for (let i = 0; i < 6; i++) nav.drive(bot, { action: 'wander' });
  assert(lookCount === 2, 'stuck triggers again after threshold at new position');
})();

// RED 9: DIR_YAW exports correct values
(function() {
  assert(DIR_YAW.north === Math.PI, 'north = PI');
  assert(DIR_YAW.south === 0, 'south = 0');
  assert(DIR_YAW.east === -Math.PI / 2, 'east = -PI/2');
  assert(DIR_YAW.west === Math.PI / 2, 'west = PI/2');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`NavigationArc: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All NavigationArc tests passed! ✅');
