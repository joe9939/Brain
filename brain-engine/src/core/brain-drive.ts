// Drive System — 马斯洛动机引擎
// 每个 tick 评估需求层级, 生成目标
// Level 1 > Level 2 > Level 3 > Level 4 > Level 5

import { WorldSnapshot } from './types';

export interface DriveGoal {
  action: string;
  priority: number;  // 5=最高(生理), 1=最低(自我实现)
  reason: string;
}

export class DriveSystem {
  private boredom = 0;
  private tickCount = 0;
  private currentGoal: DriveGoal | null = null;
  private hasShelter = false;
  private hasTools = false;

  tick(snapshot: WorldSnapshot): DriveGoal | null {
    this.tickCount++;
    const p = snapshot.position;

    // ── Level 1: 生理需求 (优先级 5) ──
    if (snapshot.hunger < 10) {
      return this.setGoal({ action: 'seek_food', priority: 5, reason: 'hungry' });
    }
    if (snapshot.health < 8) {
      return this.setGoal({ action: 'seek_food', priority: 5, reason: 'low_health' });
    }
    if (snapshot.onFire || snapshot.inLava) {
      return this.setGoal({ action: 'flee', priority: 5, reason: 'on_fire' });
    }
    if (snapshot.position.y < -10) {
      return this.setGoal({ action: 'place_block', priority: 5, reason: 'void' });
    }

    // ── Level 2: 安全需求 (优先级 4) ──
    const isNight = snapshot.timeOfDay > 13000 || snapshot.timeOfDay < 500;
    const hasMonsters = Object.values(snapshot.entities).some(
      (e: any) => e.type === 'zombie' || e.type === 'skeleton' || e.type === 'creeper'
    );
    if (isNight && !this.hasShelter) {
      return this.setGoal({ action: 'build_shelter', priority: 4, reason: 'night_falling' });
    }
    if (hasMonsters && !this.hasWeapon(snapshot)) {
      return this.setGoal({ action: 'craft_tool', priority: 4, reason: 'monsters_nearby' });
    }
    if (snapshot.oxygen < 10) {
      return this.setGoal({ action: 'move_to_surface', priority: 4, reason: 'drowning' });
    }

    // ── Level 3: 社交/归属 (优先级 3) ──
    // (MC 中暂不实现, 预留)

    // ── Level 4: 成就/尊重 (优先级 2) ──
    if (!this.hasTools) {
      const hasIron = snapshot.inventory.some(i => i.item.includes('iron'));
      const hasStone = snapshot.inventory.some(i => i.item.includes('stone'));
      if (hasIron) {
        return this.setGoal({ action: 'craft_tool', priority: 2, reason: 'upgrade_iron' });
      }
    }

    // ── Level 5: 自我实现 + 无聊检测 ──
    this.boredom += 0.02; // 每 tick 积累无聊
    if (this.boredom > 0.6) {
      this.boredom = 0;
      return this.setGoal({ action: 'wander', priority: 1, reason: 'bored' });
    }

    return this.setGoal({ action: 'idle', priority: 0, reason: 'satisfied' });
  }

  getCurrentGoal(): DriveGoal | null {
    return this.currentGoal;
  }

  private setGoal(goal: DriveGoal): DriveGoal {
    this.currentGoal = goal;
    return goal;
  }

  private hasWeapon(snapshot: WorldSnapshot): boolean {
    return snapshot.inventory.some(i => i.item.includes('sword') || i.item.includes('axe'));
  }
}
