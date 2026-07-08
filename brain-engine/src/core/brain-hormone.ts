// Hormone System — 全局调制器
// 影响: reflex阈值, 预测敏感度, 记忆编码, 情绪衰减
// 受: 情绪, 预测误差, 奖赏 共同调节

import { HormoneState } from './types';

export class HormoneSystem {
  state: HormoneState = {
    adrenaline: 0,
    cortisol: 0,
    endorphin: 0,
    dopamine: 0.5,
    serotonin: 0.5,
    oxytocin: 0,
  };

  /**
   * 每个 tick 更新激素水平
   * @param emotion 当前情绪
   * @param reward 当前奖赏信号
   */
  tick(emotion: { mode: string; intensity: number }, reward: { td_error: number }): void {
    // ── 情绪 → 激素 ──
    if (emotion.mode === 'URGENT') {
      this.state.adrenaline = Math.min(1, this.state.adrenaline + emotion.intensity * 0.8);
    }
    if (emotion.mode === 'CAUTION') {
      this.state.cortisol = Math.min(1, this.state.cortisol + 0.02);
    }
    if (emotion.mode === 'SUPPORT') {
      this.state.oxytocin = Math.min(1, this.state.oxytocin + 0.4);
    }

    // ── 奖赏 → 激素 ──
    if (reward.td_error > 0) {
      this.state.endorphin = Math.min(1, this.state.endorphin + reward.td_error * 0.3);
    }

    // ── 激素相互影响 ──
    if (this.state.adrenaline > 0.7) {
      this.state.serotonin *= 0.9;
    }
    if (this.state.endorphin > 0.5 && this.state.cortisol > 0) {
      this.state.cortisol = Math.max(0, this.state.cortisol - 0.05);
    }

    // ── 自然衰减 ──
    this.state.adrenaline *= 0.8;    // 快速 (秒级)
    this.state.endorphin *= 0.97;    // 中速
    this.state.oxytocin  *= 0.97;    // 中速
    this.state.cortisol  *= 0.998;   // 极慢 (时级)

    // 保持在 0-1 范围
    for (const key of Object.keys(this.state) as (keyof HormoneState)[]) {
      this.state[key] = Math.max(0, Math.min(1, this.state[key]));
    }
  }

  /** 激素调制预测误差阈值 — 压力大更敏感, 愉悦时更迟钝 */
  modulateSurpriseThreshold(base: number): number {
    let mod = base;
    mod *= 1 - this.state.cortisol * 0.4;      // 压力 → 阈值降低(更警觉)
    mod *= 1 + this.state.endorphin * 0.3;      // 愉悦 → 阈值升高(更放松)
    mod *= 1 + this.state.adrenaline * 0.2;     // 肾上腺素 → 略升高(战斗模式)
    return Math.max(0.05, Math.min(1, mod));
  }

  /** 激素调制反射阈值 — 肾上腺素高 → 更敏感 */
  modulateReflexThreshold(base: number): number {
    return base * (1 - this.state.adrenaline * 0.4);
  }

  /** 激素调制记忆重要性 — 高唤醒事件记得更牢 */
  modulateMemoryImportance(base: number): number {
    const boost = (this.state.adrenaline * 0.5 + this.state.cortisol * 0.3);
    return Math.min(1, base * (1 + boost));
  }
}
