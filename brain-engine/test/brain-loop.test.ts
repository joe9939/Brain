// Brain Loop Tests — 50ms tick 调度器
// RED: BrainLoop 不存在
// GREEN: 创建最小实现

import { BrainLoop } from '../src/core/brain-loop';
import { WorldSnapshot } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(): WorldSnapshot {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20, healthDelta: 0, hunger: 20, oxygen: 20,
    onFire: false, inLava: false, falling: false,
    blocks: [], entities: [], inventory: [],
    timeOfDay: 1000, dimension: 'overworld',
  };
}

function testBrainLoopExists() {
  console.log('\n🆕 BrainLoop Exists');
  const bl = new BrainLoop({ tickInterval: 50 });
  assert(typeof bl.start === 'function', 'has start method');
  assert(typeof bl.stop === 'function', 'has stop method');
  assert(typeof bl.isRunning === 'function', 'has isRunning method');
}

function testStartStop() {
  console.log('\n🔄 Start and Stop');
  const bl = new BrainLoop({ tickInterval: 50 });
  assert(!bl.isRunning(), 'not running initially');

  bl.start({ perceive: () => makeSnapshot() } as any);
  assert(bl.isRunning(), 'running after start');

  bl.stop();
  assert(!bl.isRunning(), 'stopped after stop');
}

function testTickCallback() {
  console.log('\n📞 Tick Callback');
  let tickCount = 0;
  const bl = new BrainLoop({
    tickInterval: 50,
    onTick: async () => { tickCount++; },
  });

  bl.start({ perceive: () => makeSnapshot() } as any);
  
  // Wait a bit for ticks to fire
  return new Promise<void>(resolve => {
    setTimeout(() => {
      bl.stop();
      assert(tickCount >= 1, 'at least 1 tick fired');
      resolve();
    }, 120);
  });
}

function testWorldInterface() {
  console.log('\n🌍 World Interface');
  const bl = new BrainLoop({ tickInterval: 50 });
  let lastSnapshot: WorldSnapshot | null = null;

  bl.start({
    perceive: () => {
      const snap = makeSnapshot();
      lastSnapshot = snap;
      return snap;
    },
  } as any);

  return new Promise<void>(resolve => {
    setTimeout(() => {
      bl.stop();
      assert(lastSnapshot !== null, 'world perceive was called');
      resolve();
    }, 100);
  });
}

function testMultipleStartStop() {
  console.log('\n🔁 Multiple Start/Stop Cycles');
  const bl = new BrainLoop({ tickInterval: 50 });
  
  bl.start({ perceive: () => makeSnapshot() } as any);
  bl.stop();
  bl.start({ perceive: () => makeSnapshot() } as any);
  assert(bl.isRunning(), 'still running after restart');
  bl.stop();
  assert(!bl.isRunning(), 'stopped after second stop');
}

// ─── RUN ───
async function main() {
  console.log('🧠 BRAIN LOOP TESTS');
  console.log('='.repeat(50));

  testBrainLoopExists();
  testStartStop();
  await testTickCallback();
  await testWorldInterface();
  testMultipleStartStop();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`BrainLoop: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) process.exit(1);
  else console.log('All brain loop tests passed! ✅');
}
await main();
