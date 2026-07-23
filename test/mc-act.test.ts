// Minecraft Act Tests — 完整 Mineflayer 4层动作映射
import { act } from '../adapter/minecraft/mc-act';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeMockBot(): any {
  const calls: { method: string; args: any[] }[] = [];
  let holding: string | null = null;
  const bot: any = {
    _calls: calls,
    _holding: () => holding,
    entity: { position: { x: 0, y: 64, z: 0 } },
    setControlState(s: string, v: boolean) { calls.push({ method: 'setControlState', args: [s, v] }); },
    clearControlStates() { calls.push({ method: 'clearControlStates', args: [] }); },
    look(y: number, p: number, f?: boolean) { calls.push({ method: 'look', args: [y, p, f] }); },
    lookAt(pos: any) { calls.push({ method: 'lookAt', args: [pos] }); },
    attack(e: any) { calls.push({ method: 'attack', args: [e] }); },
    consume() { calls.push({ method: 'consume', args: [] }); },
    dig(b: any) { calls.push({ method: 'dig', args: [b] }); },
    equip(i: any, d: any) { calls.push({ method: 'equip', args: [i, d] }); holding = i; },
    placeBlock(r: any, f: any) {
      calls.push({ method: 'placeBlock', args: [r, f] });
      if (!holding) throw new Error('must be holding an item to place');
    },
    activateBlock(b: any) { calls.push({ method: 'activateBlock', args: [b] }); },
    activateEntity(e: any) { calls.push({ method: 'activateEntity', args: [e] }); },
    chat(m: string) { calls.push({ method: 'chat', args: [m] }); },
    toss(i: any, m: any, c: any) { calls.push({ method: 'toss', args: [i, m, c] }); },
    craft(r: any, c: any) { calls.push({ method: 'craft', args: [r, c] }); },
    fish() { calls.push({ method: 'fish', args: [] }); },
    sleep(b: any) { calls.push({ method: 'sleep', args: [b] }); },
    wake() { calls.push({ method: 'wake', args: [] }); },
    useOn(e: any) { calls.push({ method: 'useOn', args: [e] }); },
    mount(e: any) { calls.push({ method: 'mount', args: [e] }); },
    dismount() { calls.push({ method: 'dismount', args: [] }); },
    setQuickBarSlot(s: number) { calls.push({ method: 'setQuickBarSlot', args: [s] }); },
    respawn() { calls.push({ method: 'respawn', args: [] }); },
    openChest(b: any) { calls.push({ method: 'openChest', args: [b] }); },
    openContainer(b: any) { calls.push({ method: 'openContainer', args: [b] }); },
    openFurnace(b: any) { calls.push({ method: 'openFurnace', args: [b] }); },
    openEnchantmentTable(b: any) { calls.push({ method: 'openEnchantmentTable', args: [b] }); },
    openVillager(e: any) { calls.push({ method: 'openVillager', args: [e] }); },
    findBlock(o: any) { calls.push({ method: 'findBlock', args: [o] }); return null; },
    findBlocks(o: any) { calls.push({ method: 'findBlocks', args: [o] }); return []; },
    swingArm(h?: any) { calls.push({ method: 'swingArm', args: [h] }); },
    stopDigging() { calls.push({ method: 'stopDigging', args: [] }); },
    moveVehicle(l: number, f: number) { calls.push({ method: 'moveVehicle', args: [l, f] }); },
    blockAt(p: any) { calls.push({ method: 'blockAt', args: [p] }); return { name: 'stone', position: p }; },
    updateSign(b: any, t: string, back?: boolean) { calls.push({ method: 'updateSign', args: [b, t, back] }); },
    acceptResourcePack() { calls.push({ method: 'acceptResourcePack', args: [] }); },
    denyResourcePack() { calls.push({ method: 'denyResourcePack', args: [] }); },
    closeWindow(w?: any) { calls.push({ method: 'closeWindow', args: [w] }); },
  };
  return bot;
}

function hasCall(bot: any, method: string): boolean {
  return bot._calls.some((c: any) => c.method === method);
}

// ═══════════════════════════════════════
// Level 1: Reflex (本能)
// ═══════════════════════════════════════
console.log('\n⚡ Level 1: Reflex (本能)');
(function() {
  const b1 = makeMockBot(); act(b1, { action: 'eat_food' });
  assert(hasCall(b1, 'consume'), 'eat_food → consume');
  
  const b2 = makeMockBot(); act(b2, { action: 'flee' });
  assert(hasCall(b2, 'setControlState'), 'flee → move');
  
  const b3 = makeMockBot();
  act(b3, { action: 'attack', params: { entityId: 'z' } }, { z: { id: 'z' } });
  assert(hasCall(b3, 'attack'), 'attack → attack');
  
  const b4 = makeMockBot(); act(b4, { action: 'place_block', params: { blockType: 'dirt' } });
  assert(hasCall(b4, 'placeBlock') || hasCall(b4, 'equip'), 'place_block → placeBlock/equip');
  
  const b5 = makeMockBot(); act(b5, { action: 'move_to_surface' });
  assert(hasCall(b5, 'setControlState'), 'move_to_surface → move');
})();

// ═══════════════════════════════════════
// Level 2: Motor (基本运动)
// ═══════════════════════════════════════
console.log('🏃 Level 2: Motor (基本运动)');
(function() {
  for (const dir of ['forward','back','left','right']) {
    const bot = makeMockBot(); act(bot, { action: `move_${dir}` });
    assert(hasCall(bot, 'setControlState'), `move_${dir} → setControlState`);
  }
  const b1 = makeMockBot(); act(b1, { action: 'jump' }); assert(hasCall(b1, 'setControlState'), 'jump');
  const b2 = makeMockBot(); act(b2, { action: 'sneak' }); assert(hasCall(b2, 'setControlState'), 'sneak');
  const b3 = makeMockBot(); act(b3, { action: 'sprint' }); assert(hasCall(b3, 'setControlState'), 'sprint');
  const b4 = makeMockBot(); act(b4, { action: 'look_at', params: { x: 0, y: 0, z: 0 } }); assert(hasCall(b4, 'lookAt'), 'look_at');
  const b5 = makeMockBot(); act(b5, { action: 'set_quickbar', params: { slot: 1 } }); assert(hasCall(b5, 'setQuickBarSlot'), 'set_quickbar');
})();

// ═══════════════════════════════════════
// Level 3: Skill (程序技能)
// ═══════════════════════════════════════
console.log('⛏️ Level 3: Skill (程序技能)');
(async function() {
  const b1 = makeMockBot(); await act(b1, { action: 'dig', params: { block: {} } }); assert(hasCall(b1, 'dig'), 'dig');
  const b2 = makeMockBot(); await act(b2, { action: 'craft', params: { recipe: 'planks' } }); assert(hasCall(b2, 'craft'), 'craft');
  const b3 = makeMockBot(); await act(b3, { action: 'fish' }); assert(hasCall(b3, 'fish'), 'fish');
  const b4 = makeMockBot(); await act(b4, { action: 'sleep', params: { bed: {} } }); assert(hasCall(b4, 'sleep'), 'sleep');
  const b5 = makeMockBot(); await act(b5, { action: 'wake' }); assert(hasCall(b5, 'wake'), 'wake');
  const b6 = makeMockBot(); await act(b6, { action: 'open_chest', params: { block: {} } }); assert(hasCall(b6, 'openChest'), 'open_chest');
  const b7 = makeMockBot(); await act(b7, { action: 'equip', params: { item: 'pickaxe' } }); assert(hasCall(b7, 'equip'), 'equip');
  const b8 = makeMockBot(); await act(b8, { action: 'toss', params: { item: 'stone', count: 1 } }); assert(hasCall(b8, 'toss'), 'toss');
  const b9 = makeMockBot(); await act(b9, { action: 'activate_block', params: { block: {} } }); assert(hasCall(b9, 'activateBlock'), 'activate_block');
  const ba = makeMockBot(); await act(ba, { action: 'swing_arm' }); assert(hasCall(ba, 'swingArm'), 'swing_arm');
  const bb = makeMockBot(); await act(bb, { action: 'use_on', params: { entity: {} } }); assert(hasCall(bb, 'useOn'), 'use_on');
  const bc = makeMockBot(); await act(bc, { action: 'mount', params: { entity: {} } }); assert(hasCall(bc, 'mount'), 'mount');
  const bd = makeMockBot(); await act(bd, { action: 'dismount' }); assert(hasCall(bd, 'dismount'), 'dismount');
  const be = makeMockBot(); await act(be, { action: 'respawn' }); assert(hasCall(be, 'respawn'), 'respawn');
  const bf = makeMockBot(); await act(bf, { action: 'open_villager', params: { entity: {} } }); assert(hasCall(bf, 'openVillager'), 'open_villager');
})().catch(e => console.error(e));

// ═══════════════════════════════════════
// Level 4: Cognitive (认知工具)
// ═══════════════════════════════════════
console.log('🧠 Level 4: Cognitive (认知工具)');
(function() {
  const b1 = makeMockBot(); act(b1, { action: 'chat', params: { message: 'hi' } }); assert(hasCall(b1, 'chat'), 'chat');
  const b2 = makeMockBot(); act(b2, { action: 'find_block', params: { type: 'diamond' } }); assert(hasCall(b2, 'findBlock'), 'find_block');
  const b3 = makeMockBot(); act(b3, { action: 'wander' }); assert(hasCall(b3, 'setControlState'), 'wander');
})();

// ═══════════════════════════════════════
// Edge
// ═══════════════════════════════════════
console.log('🔹 Edge');
const b1 = makeMockBot(); act(b1, { action: 'stop' }); assert(hasCall(b1, 'clearControlStates'), 'stop');
const b2 = makeMockBot(); act(b2, { action: 'nonexistent' } as any); assert(true, 'unknown → no crash');

// RED: place_block without holding anything must not crash
(function() {
  let threw = false;
  try {
    const bot = makeMockBot();
    // no equip — hands empty
    act(bot, { action: 'place_block' });
  } catch (e) {
    threw = true;
    console.log(`  📛 Caught (expected RED): ${(e as Error).message}`);
  }
  assert(threw === false, 'place_block empty hands → no crash');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`Act: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All MC act tests passed! ✅');
