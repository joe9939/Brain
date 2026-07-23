// Hormone System �?全局调制�?// 影响: reflex阈�? 预测敏感�? 记忆编码, 情绪衰减
// �? 情绪, 预测误差, 奖赏 共同调节

import { ComponentOutput, DriveState, HormoneState } from './types.js';

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
   * 每个 tick 更新激素水�?   * @param emotion 当前情绪
   * @param reward 当前奖赏信号
   */
  tick(emotion: { mode: string; intensity: number }, reward: { td_error: number }): void {
    // ── 情绪 �?激�?──
    if (emotion.mode === 'URGENT') {
      this.state.adrenaline = Math.min(1, this.state.adrenaline + emotion.intensity * 0.8);
    }
    if (emotion.mode === 'CAUTION') {
      this.state.cortisol = Math.min(1, this.state.cortisol + 0.02);
    }
    if (emotion.mode === 'SUPPORT') {
      this.state.oxytocin = Math.min(1, this.state.oxytocin + 0.4);
    }

    // ── 奖赏 �?激�?──
    if (reward.td_error > 0) {
      this.state.endorphin = Math.min(1, this.state.endorphin + reward.td_error * 0.3);
    }

    // ── 激素相互影�?──
    if (this.state.adrenaline > 0.7) {
      this.state.serotonin *= 0.9;
    }
    if (this.state.endorphin > 0.5 && this.state.cortisol > 0) {
      this.state.cortisol = Math.max(0, this.state.cortisol - 0.05);
    }

    // ── 自然衰减 ──
    this.state.adrenaline *= 0.8;    // 快�?(秒级)
    this.state.endorphin *= 0.97;    // 中�?    this.state.oxytocin  *= 0.97;    // 中�?    this.state.cortisol  *= 0.998;   // 极慢 (时级)

    // 保持�?0-1 范围
    for (const key of Object.keys(this.state) as (keyof HormoneState)[]) {
      this.state[key] = Math.max(0, Math.min(1, this.state[key]));
    }
  }

  /** 激素调制预测误差阈�?�?压力大更敏感, 愉悦时更迟钝 */
  modulateSurpriseThreshold(base: number): number {
    let mod = base;
    mod *= 1 - this.state.cortisol * 0.4;      // 压力 �?阈值降�?更警�?
    mod *= 1 + this.state.endorphin * 0.3;      // 愉悦 �?阈值升�?更放�?
    mod *= 1 + this.state.adrenaline * 0.2;     // 肾上腺素 �?略升�?战斗模式)
    return Math.max(0.05, Math.min(1, mod));
  }

  /** 激素调制反射阈�?�?肾上腺素�?�?更敏�?*/
  modulateReflexThreshold(base: number): number {
    return base * (1 - this.state.adrenaline * 0.4);
  }

  /** 激素调制记忆重要�?�?高唤醒事件记得更�?*/
  modulateMemoryImportance(base: number): number {
    const boost = (this.state.adrenaline * 0.5 + this.state.cortisol * 0.3);
    return Math.min(1, base * (1 + boost));
  }

  /**
   * Update hormone levels from component outputs.
   * Analogy: amygdala → adrenaline, reward → dopamine, ACC → cortisol
   */
  updateFromComponents(outputs: Map<string, ComponentOutput>): void {
    for (const [id, out] of outputs) {
      if (id === 'amygdala' && out.signals.emotion) {
        this.state.adrenaline = Math.min(1, this.state.adrenaline + out.signals.emotion * 0.3);
      }
      if (id === 'reward' && out.signals.reward) {
        this.state.dopamine = Math.min(1, this.state.dopamine + out.signals.reward * 0.2);
      }
      if (id === 'anterior-cingulate' && out.signals.action) {
        this.state.cortisol = Math.min(1, this.state.cortisol + out.signals.action * 0.1);
      }
      if (id === 'safety' && out.signals.safety) {
        this.state.adrenaline = Math.min(1, this.state.adrenaline + out.signals.safety * 0.2);
      }
    }
    // Apply decay after update
    this.state.adrenaline *= 0.9;
    this.state.dopamine *= 0.95;
    for (const key of Object.keys(this.state) as (keyof HormoneState)[]) {
      this.state[key] = Math.max(0, Math.min(1, this.state[key]));
    }
  }

  /**
   * Build hormone + drive context string for component prompts.
   * Injected into every stage's input so all components are hormone-aware.
   * Optional dominant need info from MaslowWaveSystem.
   */
  buildHormoneContext(drives?: DriveState, dominant?: { level: number; intensity: number }): string {
    const h = this.state;
    let ctx = `## Hormones\nadrenaline=${h.adrenaline.toFixed(2)} cortisol=${h.cortisol.toFixed(2)} endorphin=${h.endorphin.toFixed(2)} dopamine=${h.dopamine.toFixed(2)} serotonin=${h.serotonin.toFixed(2)} oxytocin=${h.oxytocin.toFixed(2)}`;
    if (drives) {
      ctx += `\n## Drives\nhunger=${drives.hunger.toFixed(2)} fear=${drives.fear.toFixed(2)} fatigue=${drives.fatigue.toFixed(2)} curiosity=${drives.curiosity.toFixed(2)} social=${drives.social.toFixed(2)} mastery=${drives.mastery.toFixed(2)}`;
    }
    if (dominant) {
      ctx += `\n## Dominant Need\nlevel=${dominant.level} intensity=${dominant.intensity.toFixed(2)}`;
    }
    return ctx;
  }
}
