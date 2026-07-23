// Reflex Arc — 生存反射层 (0 LLM, <1ms)
// 可插拔 ReflexHandler 数组，按优先级遍历
// 参考: xagent homeostatic monitoring, brain v2 G1-G7

import { WorldSnapshot } from '../../world-interface/types.js';
import { ReflexAction, ReflexHandler } from '../../world-interface/reflex.js';

/**
 * SurvivalReflex — Minecraft 场景生存反射
 * 优先级: 0=最高(致命), 5=最低(常规)
 * 激素影响: adrenaline ↑ → 阈值降低(更敏感)
 */
export class SurvivalReflex implements ReflexHandler {
  name = 'minecraft-survival';
  priority = 0;

  check(snapshot: WorldSnapshot, hormone?: { modulateReflexThreshold(base: number): number }): ReflexAction | null {
    // 用激素调制阈值
    const healthThreshold = hormone ? hormone.modulateReflexThreshold(5) : 5;
    const hungerThreshold = hormone ? hormone.modulateReflexThreshold(10) : 10;

    // R1: 卡方块窒息 — 头在固体方块里 → 破坏或移动
    const headBlocked = (snapshot.blocks || []).some(b => {
      const dx = Math.abs(b.position.x - Math.floor(snapshot.position.x));
      const dy = Math.abs(b.position.y - Math.floor(snapshot.position.y + 1));
      const dz = Math.abs(b.position.z - Math.floor(snapshot.position.z));
      return dx <= 0 && dy <= 0 && dz <= 0 && b.type !== 'air' && b.type !== 'water';
    });
    if (headBlocked && snapshot.healthDelta < 0) {
      return { priority: 0, action: 'dig_nearby' };
    }
    // R2: 掉落虚空 (y < -10)
    if (snapshot.position.y < -10) {
      return { priority: 0, action: 'place_block', target: 'below' };
    }
    // R3: 着火/岩浆
    if (snapshot.onFire || snapshot.inLava) {
      return { priority: 0, action: 'move_to_water' };
    }
    // R4: 溺水 (oxygen < 5)
    if (snapshot.oxygen < 5) {
      return { priority: 1, action: 'move_to_surface' };
    }
    // R5: 战斗反射 — 附近有敌对 + 掉血 → 逃跑
    const HOSTILE_TYPES = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'phantom'];
    const hasHostileNear = (snapshot.entities || []).some(e =>
      HOSTILE_TYPES.some(h => e.type.toLowerCase().includes(h))
    );
    if (hasHostileNear && (snapshot.healthDelta < 0 || snapshot.health < 10)) {
      return { priority: 1, action: 'flee' };
    }
    // R6: 低血量 — 阈值受激素影响
    if (snapshot.health < healthThreshold) {
      return { priority: 2, action: 'eat_food' };
    }
    // R7: 饥饿 — 阈值受激素影响
    if (snapshot.hunger < hungerThreshold) {
      return { priority: 3, action: 'eat_food' };
    }
    return null;
  }
}

/**
 * GatheringReflex — 巴甫洛夫条件反射: 看到可挖方块 → 自动采集
 * 优先级 5 (最低), 仅在无紧急需求时触发
 * 等价于人走在路上看到花顺手摘, 不进大脑决策
 * 条件刺激: 附近有 wood/ore/stone
 * 条件反应: dig_nearby
 */
export class GatheringReflex implements ReflexHandler {
  name = 'minecraft-gathering';
  priority = 5;
  private lastDigPos: string | null = null;
  private digCooldown = 0;
  private idleCooldown = 0;
  private failedPos: Set<string> = new Set();

  check(snapshot: WorldSnapshot): ReflexAction | null {
    // 紧急需求时停止采集 (生存优先)
    if (snapshot.health < 8 || snapshot.hunger < 6 || snapshot.onFire || snapshot.inLava) {
      return null;
    }
    // Cooldown: 挖完等20 tick, 频繁失败时也等40 tick
    if (this.digCooldown > 0) { this.digCooldown--; return null; }
    if (this.idleCooldown > 0) { this.idleCooldown--; return null; }

    // 可挖方块: 所有log类型, 矿石, 石头
    const MINABLE = ['log', '_ore', 'stone', 'diorite', 'andesite', 'granite', 'coal', 'copper', 'iron', 'gravel'];
    const pos = snapshot.position;
    // 扫描附近5格内可挖方块, 把位置传给 dig_nearby
    const nearby = (snapshot.blocks || []).find(b => {
      if (!MINABLE.some(m => b.type.includes(m))) return false;
      const dx = b.position.x - pos.x;
      const dy = b.position.y - pos.y;
      const dz = b.position.z - pos.z;
      return Math.sqrt(dx*dx + dy*dy + dz*dz) <= 5;
    });
    if (!nearby) {
      this.idleCooldown = 100;
      return null;
    }

    // 避免重复挖同一个方块或已经失败的方块
    const posKey = `${nearby.position.x},${nearby.position.y},${nearby.position.z}`;
    if (posKey === this.lastDigPos || this.failedPos.has(posKey)) {
      this.idleCooldown = 60;
      return null;
    }
    this.lastDigPos = posKey;
    // 清理过期的失败记录 (最多保留20个)
    if (this.failedPos.size > 20) this.failedPos.clear();
    this.digCooldown = 30;

    // 把方块位置传给 mc-act.ts, dig_nearby 用坐标定位挖掘
    return { priority: 5, action: 'dig_nearby', target: nearby.type, params: nearby.position };
  }
  resetCooldown(): void { this.digCooldown = 0; this.idleCooldown = 0; }
}

// ReflexRegistry moved to world-interface/reflex.ts — import from there
export { ReflexRegistry, ReflexAction, ReflexHandler } from '../../world-interface/reflex.js';
