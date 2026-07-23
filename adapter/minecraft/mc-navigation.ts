// Minecraft Navigation — 边缘检测 + 卡住恢复
// 让bot像真人一样行动: 不跳崖, 能脱困

/**
 * 根据 yaw 计算前方方块坐标 (返回 Vec3-like 对象)
 */
function getForwardPos(bot: any): { x: number; y: number; z: number } {
  const yaw = bot.entity.yaw || 0;
  const pos = bot.entity.position;
  const dx = -Math.round(Math.sin(yaw));
  const dz = Math.round(Math.cos(yaw));
  // 使用 Vec3 以确保 blockAt 兼容 (Mineflayer 需要 Vec3.floored())
  const Vec3 = require('vec3').Vec3;
  return new Vec3(Math.floor(pos.x) + dx, Math.floor(pos.y), Math.floor(pos.z) + dz);
}

/**
 * 检查前方是否安全（不悬崖、不撞墙、不跳水）
 * 检查前方一格的地面是否为实心方块
 */
export function isSafeAhead(bot: any, distance: number = 1): boolean {
  const fwd = getForwardPos(bot);

  // 1. 检查前方方块是否可通行（boundingBox==='empty' → 空气/水/花等无碰撞）
  const block = bot.blockAt(fwd);
  if (!block || block.boundingBox !== 'empty') {
    return false; // 墙壁（boundingBox==='block'）或未知 → 不可通行
  }

  // 2. 检查前方下方的方块是否实心（防止悬崖）
  const Vec3 = require('vec3').Vec3;
  const below = bot.blockAt(new Vec3(fwd.x, fwd.y - 1, fwd.z));
  if (!below || below.boundingBox !== 'block') {
    return false; // 悬崖：前方没有地面
  }

  // 3. 检查是否是水（避免溺水）
  if (block.name === 'water') {
    return false;
  }

  return true;
}

/**
 * 找逃脱方向 — 检测6个方向哪个有路
 * 返回 'north' | 'south' | 'east' | 'west' | null
 */
export function findEscape(bot: any): string | null {
  const pos = bot.entity.position;
  const dirs = [
    { name: 'north', dx: 0, dz: -1 },
    { name: 'south', dx: 0, dz: 1 },
    { name: 'east', dx: 1, dz: 0 },
    { name: 'west', dx: -1, dz: 0 },
  ];

  // Shuffle for variety
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }

  const Vec3 = require('vec3').Vec3;
  for (const dir of dirs) {
    const bx = Math.floor(pos.x) + dir.dx;
    const by = Math.floor(pos.y);
    const bz = Math.floor(pos.z) + dir.dz;
    const block = bot.blockAt(new Vec3(bx, by, bz));
    const below = bot.blockAt(new Vec3(bx, by - 1, bz));

    // Direction is clear if: block is passable AND there's solid ground below
    if (block && block.boundingBox === 'empty' && below && below.boundingBox === 'block') {
      return dir.name;
    }
  }

  return null;
}

/**
 * StuckDetector — 检测 bot 是否卡住
 * 追踪位置历史，如果 N 个 tick 位置没变 → stuck
 */
export class StuckDetector {
  private lastPos: { x: number; y: number; z: number } | null = null;
  private stuckTicks = 0;
  private threshold = 10;

  setThreshold(t: number): void {
    this.threshold = t;
  }

  tick(bot: any): boolean {
    const pos = bot.entity.position;
    const key = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
    const lastKey = this.lastPos ? `${Math.floor(this.lastPos.x)},${Math.floor(this.lastPos.y)},${Math.floor(this.lastPos.z)}` : null;

    if (lastKey === key) {
      this.stuckTicks++;
    } else {
      this.stuckTicks = 0;
    }

    this.lastPos = { x: pos.x, y: pos.y, z: pos.z };

    if (this.stuckTicks >= this.threshold) {
      this.stuckTicks = 0; // reset after trigger
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastPos = null;
    this.stuckTicks = 0;
  }
}
