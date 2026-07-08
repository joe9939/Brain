// Minecraft Perceive — Mineflayer bot → WorldSnapshot 映射
// 通用: 无论 brain v2 还是 GPT 都用同样的 perceive

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

export function perceive(bot: MineflayerBotLike): WorldSnapshot {
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
    health: bot.health,
    healthDelta: 0, // Mineflayer 不直接提供，需要 history tracking
    hunger: bot.food,
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
