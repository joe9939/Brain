// Reflex Arc — 生存反射层 (0 LLM, <1ms)
// 可插拔 ReflexHandler 数组，按优先级遍历
// 参考: xagent homeostatic monitoring, brain v2 G1-G7

import { WorldSnapshot, ReflexHandler, ReflexAction } from './types';

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

    // R1: 掉落虚空 (y < -10) — 最紧急
    if (snapshot.position.y < -10) {
      return { priority: 0, action: 'place_block', target: 'below' };
    }
    // R2: 着火/岩浆
    if (snapshot.onFire || snapshot.inLava) {
      return { priority: 0, action: 'move_to_water' };
    }
    // R3: 窒息 (oxygen < 5)
    if (snapshot.oxygen < 5) {
      return { priority: 1, action: 'move_to_surface' };
    }
    // R4: 低血量 — 阈值受激素影响
    if (snapshot.health < healthThreshold) {
      return { priority: 2, action: 'eat_food' };
    }
    // R5: 饥饿 — 阈值受激素影响
    if (snapshot.hunger < hungerThreshold) {
      return { priority: 3, action: 'eat_food' };
    }
    return null;
  }
}

/**
 * ReflexRegistry — 管理多个 ReflexHandler
 * 按 priority 升序（小=高优先级）遍历
 */
export class ReflexRegistry {
  private handlers: ReflexHandler[] = [];

  register(handler: ReflexHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  check(snapshot: WorldSnapshot, hormone?: { modulateReflexThreshold(base: number): number }): ReflexAction | null {
    for (const handler of this.handlers) {
      const action = handler.check(snapshot, hormone);
      if (action) return action;
    }
    return null;
  }

  clear(): void { this.handlers = []; }
  count(): number { return this.handlers.length; }
}
