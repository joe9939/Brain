// NavigationArc — 脑→动作之间的导航中间层
// 职责: 在 brain.tick() 输出动作之前插入边缘检测 + 卡住恢复
// 调用约定: nav.drive(bot, action) → (可能修改后的) action

import { isSafeAhead, findEscape, StuckDetector } from './mc-navigation';
import type { ActAction } from './mc-act';

/** 方向 → yaw 映射 */
export const DIR_YAW: Record<string, number> = {
  north: Math.PI,
  south: 0,
  east: -Math.PI / 2,
  west: Math.PI / 2,
};

export class NavigationArc {
  private stuckDetector: StuckDetector;

  /** @param stuckThreshold — 卡住多少个 tick 后触发恢复 (默认 20) */
  constructor(stuckThreshold: number = 20) {
    this.stuckDetector = new StuckDetector();
    this.stuckDetector.setThreshold(stuckThreshold);
  }

  /**
   * 驱动导航中间层:
   * 1. 如果是移动动作 + 前方有悬崖/墙 → 旋转到安全方向
   * 2. 如果卡住 → 旋转到安全方向
   * 3. 全方位包围 → 返回 jump 动作
   *
   * 副作用: 可能调用 bot.look() 或 bot.setControlState('jump')
   * 返回: 原动作 (旋转已处理安全), 或 { action: 'jump' }
   */
  drive(bot: any, action: ActAction): ActAction {
    // 仅拦截移动类动作
    const isMoving = action.action === 'wander' || action.action === 'move_to_surface' || action.action === 'move_forward';
    if (!isMoving) return action;

    // ── 1. 边缘检测 ──
    if (action.action !== 'move_to_surface' && !isSafeAhead(bot)) {
      const escape = findEscape(bot);
      if (escape) {
        bot.look(DIR_YAW[escape], 0, true);
        return action; // 旋转后继续用原动作
      }
      // 完全包围 → jump
      return { action: 'jump' };
    }

    // ── 2. 卡住检测 ──
    if (this.stuckDetector.tick(bot)) {
      const escape = findEscape(bot);
      if (escape) {
        bot.look(DIR_YAW[escape], 0, true);
        return action;
      }
      return { action: 'jump' };
    }

    return action;
  }

  /** 重置卡住检测器 (位置变化后调用) */
  reset(): void {
    this.stuckDetector.reset();
  }
}
