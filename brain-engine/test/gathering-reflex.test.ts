// GatheringReflex — Minecraft 巴甫洛夫条件反射
// 看到木头/矿石 → 自动挖 (0意识, <1ms, 最低优先级)

import { GatheringReflex } from '../../adapter/minecraft/reflex-arc.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const baseSnapshot = {
  position: { x: 0, y: 64, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  health: 20, hunger: 20, oxygen: 20,
  onFire: false, inLava: false, falling: false,
  timeOfDay: 6000,
  blocks: [], entities: [], inventory: [],
  dimension: 'overworld',
};

// ── 优先级最低 (生存反射优先) ──

console.log('\n🧪 GatheringReflex: priority');
{
  const r = new GatheringReflex();
  assert(r.name === 'minecraft-gathering', 'name correct');
  assert(r.priority === 5, 'priority 5 (lowest)');
}

// ── 附近有可挖方块 → 返回 dig_nearby ──

console.log('\n🧪 GatheringReflex: sees minable block');
{
  const r = new GatheringReflex();
  const result = r.check({
    ...baseSnapshot,
    blocks: [{ type: 'oak_log', position: { x: 3, y: 64, z: 0 } }],
  });
  assert(result !== null, 'returns action when log nearby');
  assert(result!.action === 'dig_nearby', 'action is dig_nearby');
}

// ── 附近无可挖方块 → null ──

console.log('\n🧪 GatheringReflex: no minable block');
{
  const r = new GatheringReflex();
  const result = r.check({
    ...baseSnapshot,
    blocks: [{ type: 'grass_block', position: { x: 2, y: 63, z: 0 } }],
  });
  assert(result === null, 'null when only grass nearby');
}

// ── 紧急需求压制采集 ──

console.log('\n🧪 GatheringReflex: suppressed by survival needs');
{
  const r = new GatheringReflex();
  assert(r.check({ ...baseSnapshot, health: 4 }) === null, 'low health → suppressed');
  assert(r.check({ ...baseSnapshot, hunger: 3 }) === null, 'low hunger → suppressed');
  assert(r.check({ ...baseSnapshot, onFire: true }) === null, 'on fire → suppressed');
}

// ── 可挖方块类型: log, ore, stone ──

console.log('\n🧪 GatheringReflex: minable block types');
{
  const minable = ['oak_log', 'stone', 'iron_ore', 'coal_ore', 'birch_log', 'diamond_ore'];
  for (const type of minable) {
    const r = new GatheringReflex();  // fresh reflex per type avoids cooldown
    const result = r.check({ ...baseSnapshot, blocks: [{ type, position: { x: 2, y: 64, z: 0 } }] });
    assert(result !== null, `${type} is minable`);
  }
}

// ── 不可挖: 空气, 草, 花, 水 ──

console.log('\n🧪 GatheringReflex: non-minable block types');
{
  const r = new GatheringReflex();
  const notMinable = ['air', 'grass_block', 'dandelion', 'water', 'tall_grass'];
  for (const type of notMinable) {
    const result = r.check({ ...baseSnapshot, blocks: [{ type, position: { x: 2, y: 64, z: 0 } }] });
    assert(result === null, `${type} is not minable`);
  }
}

// ── 远离的方块不触发 (>1格) ──

console.log('\n🧪 GatheringReflex: distance check');
{
  const r = new GatheringReflex();
  const far = r.check({ ...baseSnapshot, blocks: [{ type: 'oak_log', position: { x: 8, y: 64, z: 0 } }] });
  assert(far === null, 'far log (dx=8) not triggered');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`GatheringReflex: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All GatheringReflex tests passed! ⛏️✅');
