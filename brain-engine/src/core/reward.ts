// Reward System �?§2.4: Reward/learning signals
// M^rew = {score, total, td_error, history}
// §2.4.3: Extrinsic + Intrinsic rewards, TD learning

import { RewardState } from './types.js';

export class RewardSystem {
  static default(): RewardState {
    return { score: 0, total: 0, td_error: 0, history: [] };
  }

  // Update reward based on outcome
  update(state: RewardState, outcome: { success: boolean; duration?: number }): RewardState {
    const prevScore = state.score;

    // Extrinsic reward (§2.4.3)
    const extrinsic = outcome.success ? 1.0 : -0.5;

    // Duration penalty
    const timePenalty = outcome.duration ? Math.min(outcome.duration / 10000, 0.3) : 0;

    const newScore = state.score + extrinsic - timePenalty;
    const td_error = newScore - prevScore;

    return {
      score: Math.round(newScore * 10) / 10,
      total: state.total + 1,
      td_error: Math.round(td_error * 100) / 100,
      history: [...state.history, newScore].slice(-100),
    };
  }

  // Intrinsic reward for exploration (§2.4.3)
  intrinsicReward(novelty: number): number {
    return Math.min(novelty * 0.3, 1.0);
  }
}
