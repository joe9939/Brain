// State Evolution — 空闲状态演化 (0 LLM, <1ms)
// 参考: NEURON657 FreeEnergyManager, xagent homeostatic monitor
// 每 tick 都在后台跑: 情绪衰减、内稳态变化、记忆巩固

import { MentalState } from './types';

export class StateEvolution {
  /**
   * 每个 tick 都跑，不走 LLM
   * @param dt 距上次 tick 的毫秒数
   */
  tick(state: MentalState, dt: number): void {
    const seconds = dt / 1000;

    // 1. 情绪基线回归
    state.emo.intensity = Math.max(0.05, state.emo.intensity - seconds * 0.01);
    state.emo.valence += (0 - state.emo.valence) * seconds * 0.005;
    state.emo.arousal = Math.max(0.05, state.emo.arousal - seconds * 0.02);

    // 2. 强度足够低 → 回归 NORMAL
    if (state.emo.intensity < 0.15 && state.emo.mode !== 'NORMAL') {
      state.emo.mode = 'NORMAL';
    }
  }
}
