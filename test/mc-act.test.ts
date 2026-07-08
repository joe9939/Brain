// Minecraft Act Tests — TickResult → Mineflayer 动作执行
// RED: mc-act.ts 不存在

import { act } from '../adapter/minecraft/mc-act';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ─── Mock Mineflayer bot ───
function makeMockBot(): any {
  const calls: { method: string; args: any[] }[] = [];
  const bot: any = {
    _calls: calls,
    setControlState(state: string, value: boolean) {
      calls.push({ method: 'setControlState', args: [state, value] });
    },
    lookAt(pos: any) { calls.push({ method: 'lookAt', args: [pos] }); },
    attack(entity: any) { calls.push({ method: 'attack', args: [entity] }); },
    consume() { calls.push({ method: 'consume', args: [] }); },
    dig(block: any) { calls.push({ method: 'dig', args: [block] }); },
    placeBlock(ref: any, face: any) { calls.push({ method: 'placeBlock', args: [ref, face] }); },
    chat(msg: string) { calls.push({ method: 'chat', args: [msg] }); },
    equip(item: any, dest: any) { calls.push({ method: 'equip', args: [item, dest] }); },
    craft(recipe: any, count: any) { calls.push({ method: 'craft', args: [recipe, count] }); },
    activateBlock(block: any) { calls.push({ method: 'activateBlock', args: [block] }); },
    toss(item: any, meta: any, count: any) { calls.push({ method: 'toss', args: [item, meta, count] }); },
    fish() { calls.push({ method: 'fish', args: [] }); },
    sleep(bed: any) { calls.push({ method: 'sleep', args: [bed] }); },
    wake() { calls.push({ method: 'wake', args: [] }); },
    clearControlStates() { calls.push({ method: 'clearControlStates', args: [] }); },
  };
  return bot;
}

function testActExists() {
  console.log('\n🆕 act() Exists');
  assert(typeof act === 'function', 'act is a function');
}

function testMoveForward() {
  console.log('\n🏃 Move Forward');
  const bot = makeMockBot();
  act(bot, { action: 'move_forward' });
  assert(bot._calls[0].method === 'setControlState', 'calls setControlState');
  assert(bot._calls[0].args[0] === 'forward', 'control = forward');
  assert(bot._calls[0].args[1] === true, 'value = true');
}

function testStopMoving() {
  console.log('\n🛑 Stop Moving');
  const bot = makeMockBot();
  act(bot, { action: 'stop' });
  assert(bot._calls.some((c: any) => c.method === 'clearControlStates'), 'clearControlStates called');
}

function testAttack() {
  console.log('\n⚔️ Attack');
  const bot = makeMockBot();
  const target = { id: 'zombie-1' };
  act(bot, { action: 'attack', params: { entityId: target.id } }, { 'zombie-1': target });
  assert(bot._calls[0].method === 'attack', 'attack called');
}

function testEat() {
  console.log('\n🍔 Eat');
  const bot = makeMockBot();
  act(bot, { action: 'eat_food' });
  assert(bot._calls[0].method === 'consume', 'consume called');
}

function testMoveToWater() {
  console.log('\n💧 Move to Water');
  const bot = makeMockBot();
  act(bot, { action: 'move_to_water' });
  // Should trigger movement toward nearest water
  assert(bot._calls.some((c: any) => c.method === 'setControlState'), 'setControlState called');
}

function testPlaceBlock() {
  console.log('\n🧱 Place Block');
  const bot = makeMockBot();
  act(bot, { action: 'place_block', params: { blockType: 'dirt' } });
  assert(bot._calls[0].method === 'equip' || bot._calls[0].method === 'placeBlock', 'equip or placeBlock called');
}

function testLookAt() {
  console.log('\n👀 Look At');
  const bot = makeMockBot();
  act(bot, { action: 'look_at', params: { x: 10, y: 64, z: 10 } });
  assert(bot._calls[0].method === 'lookAt', 'lookAt called');
}

function testChat() {
  console.log('\n💬 Chat');
  const bot = makeMockBot();
  act(bot, { action: 'chat', params: { message: 'Hello everyone!' } });
  assert(bot._calls[0].method === 'chat', 'chat called');
  assert(bot._calls[0].args[0] === 'Hello everyone!', 'message sent');
}

function testUnknownAction() {
  console.log('\n❓ Unknown Action — no crash');
  const bot = makeMockBot();
  act(bot, { action: 'nonexistent_action' } as any);
  assert(bot._calls.length === 0, 'no calls for unknown action');
}

// ─── RUN ───
console.log('🧠 MC ACT TESTS');
console.log('='.repeat(50));

testActExists();
testMoveForward();
testStopMoving();
testAttack();
testEat();
testMoveToWater();
testPlaceBlock();
testLookAt();
testChat();
testUnknownAction();

console.log(`\n${'='.repeat(50)}`);
console.log(`Act: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All act tests passed! ✅');
