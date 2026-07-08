// Minecraft Perceive — Mineflayer bot → WorldSnapshot 映射
// 通用: 无论 brain v2 还是 GPT 都用同样的 perceive
// v2: 带 healthDelta 追踪, 支持激素系统

import { WorldSnapshot } from '../../brain-engine/src/core/types';

export interface MineflayerBotLike {
  entity: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    onGround?: boolean;
  };
  health: number;
  food: number;
  foodSaturation?: number;
  oxygenLevel?: number;
  isOnFire: boolean;
  isInLava?: boolean;
  isSleeping?: boolean;
  game?: { dimension?: string };
  time?: { timeOfDay?: number; isDay?: boolean };
  isRaining?: boolean;
  inventory: { items: () => { name?: string; count: number }[] };
  entities: Record<string, { type?: string; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } }>;
  blockAt?: (pos: any) => any;
  nearestEntity?: () => any;
  findBlocks?: (opts: any) => any[];
}

/**
 * MinecraftPerceiver — 带状态追踪的 perceive
 * 追踪 health/hunger 历史, 计算 healthDelta
 */
export class MinecraftPerceiver {
  private lastHealth: number | null = null;
  private lastHunger: number | null = null;

  perceive(bot: MineflayerBotLike): WorldSnapshot {
    const health = bot.health;
    const hunger = bot.food;

    // 计算 delta (首次调用时为 0)
    const healthDelta = this.lastHealth !== null ? health - this.lastHealth : 0;
    const hungerDelta = this.lastHunger !== null ? hunger - this.lastHunger : 0;

    // 更新历史
    this.lastHealth = health;
    this.lastHunger = hunger;

    return {
      position: {
        x: bot.entity.position.x,
        y: bot.entity.position.y,
        z: bot.entity.position.z,
      },
      velocity: {
        x: bot.entity.velocity.x,
        y: bot.entity.velocity.y,
        z: bot.entity.velocity.z,
      },
      health,
      healthDelta,
      hunger,
      oxygen: bot.oxygenLevel ?? 20,
      onFire: bot.isOnFire,
      inLava: bot.isInLava ?? false,
      falling: !bot.entity.onGround && bot.entity.velocity.y < -0.1,
      blocks: [],
      entities: Object.entries(bot.entities || {}).map(([id, e]) => ({
        id,
        type: e.type || 'unknown',
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        velocity: { x: e.velocity.x, y: e.velocity.y, z: e.velocity.z },
      })),
      inventory: (bot.inventory?.items() || []).map(item => ({
        item: item.name || 'unknown',
        count: item.count,
      })),
      timeOfDay: bot.time?.timeOfDay ?? 0,
      dimension: bot.game?.dimension ?? 'overworld',
    };
  }

  reset(): void {
    this.lastHealth = null;
    this.lastHunger = null;
  }
}

// 保持向后兼容 — 无状态版本的 perceive
let _perceiver = new MinecraftPerceiver();
export function perceive(bot: MineflayerBotLike): WorldSnapshot {
  return _perceiver.perceive(bot);
}
