// State Evolution — 空闲状态演化 (0 LLM, <1ms)
// 参考: NEURON657 FreeEnergyManager, xagent homeostatic monitor
// 每 tick 都在后台跑: 情绪衰减、内稳态变化、记忆巩固

import { MentalState } from './types';

export interface HormoneLevels {
  adrenaline: number;
  cortisol: number;
  endorphin: number;
}

export class StateEvolution {
  /**
   * 每个 tick 都跑，不走 LLM
   * @param dt 距上次 tick 的毫秒数
   * @param hormone 可选的激素调制
   */
  tick(state: MentalState, dt: number, hormone?: HormoneLevels): void {
    const seconds = dt / 1000;
    const adr = hormone?.adrenaline ?? 0;
    const cort = hormone?.cortisol ?? 0;
    const endo = hormone?.endorphin ?? 0;

    // 激素调制的衰减率: adrenaline/cortisol 减慢, endorphin 加快
    const intensityDecay = 0.01 * (1 + adr * 0.8 + cort * 0.4) * (1 - endo * 0.3);
    const valenceRegression = 0.005 * (1 + cort * 0.5) * (1 - endo * 0.2);
    const arousalDecay = 0.02 * (1 + cort * 0.3) * (1 - endo * 0.2);

    // 1. 情绪基线回归 — 激素调制
    state.emo.intensity = Math.max(0.05, state.emo.intensity - seconds * Math.max(0.001, intensityDecay));
    state.emo.valence += (0 - state.emo.valence) * seconds * Math.max(0.001, valenceRegression);
    state.emo.arousal = Math.max(0.05, state.emo.arousal - seconds * Math.max(0.001, arousalDecay));

    // 2. 强度足够低 → 回归 NORMAL
    if (state.emo.intensity < 0.15 && state.emo.mode !== 'NORMAL') {
      state.emo.mode = 'NORMAL';
    }
  }
}
