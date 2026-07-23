// Maslow Wave Model — continuous intensity ODE engine
// Replaces binary MaslowSystem with wave dynamics
// Each need level: dI/dt = α·trigger - β·(I - baseline)

export type WavePhase = 'RISING' | 'PEAK' | 'DECAYING' | 'DORMANT';

const BASELINES: Record<1|2|3|4|5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const DECAY_RATES: Record<1|2|3|4|5, number> = { 1: 0.92, 2: 0.88, 3: 0.95, 4: 0.93, 5: 0.97 };
const WEIGHTS: Record<1|2|3|4|5, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 2 };
const PEAK_THRESHOLD = 0.7;
const DORMANT_THRESHOLD = 0.2;
// L5 driven by tech tree mastery, not boredom (see tick() Phase 2)
// Frustration: when a need is high but can't be satisfied, it builds frustration
// After N ticks of unmet need, the weight drops temporarily (satiation/frustration)
const FRUSTRATION_THRESHOLD = 200;  // ticks before frustration kicks in
const FRUSTRATION_PENALTY = 0.3;    // weight multiplier reduction

export class MaslowWaveSystem {
  state: Record<1|2|3|4|5, number>;
  private prevState: Record<1|2|3|4|5, number>;
  private hormoneMods: { adrenaline: number; cortisol: number; dopamine: number };
  /** Frustration: ticks since this level was dominant but couldn't be satisfied */
  private frustration: Record<1|2|3|4|5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  constructor() {
    this.state = { ...BASELINES };
    this.prevState = { ...BASELINES };
    this.hormoneMods = { adrenaline: 0, cortisol: 0, dopamine: 0.5 };
  }

  /** Mark a need level as frustrated (action failed repeatedly) */
  markFrustrated(level: 1|2|3|4|5): void {
    this.frustration[level] = Math.min(1000, this.frustration[level] + 50);
  }

  /** Reset frustration for a level (action succeeded) */
  markSatisfied(level: 1|2|3|4|5): void {
    this.frustration[level] = 0;
  }

  /** Set hormone modulators that influence wave dynamics */
  setHormoneModulators(mods: Partial<{ adrenaline: number; cortisol: number; dopamine: number }>): void {
    Object.assign(this.hormoneMods, mods);
  }

  /** Apply a trigger event to a need level (0-1 delta) */
  applyDelta(level: 1|2|3|4|5, delta: number): void {
    this.state[level] = Math.min(1, this.state[level] + delta);
  }

  /** Reset frustration for a specific level */
  resetFrustration(level: 1|2|3|4|5): void {
    this.frustration[level] = 0;
  }

  /** Any need frustrated beyond threshold → escalate to cognitive */
  hasHighFrustration(): boolean {
    for (const level of [1, 2, 3, 4, 5] as const) {
      if (this.frustration[level] > FRUSTRATION_THRESHOLD) return true;
    }
    return false;
  }

  /** Get effective weight for a level (reduced by frustration when stuck) */
  private effectiveWeight(level: 1|2|3|4|5): number {
    const base = WEIGHTS[level];
    const frust = this.frustration[level];
    if (frust > FRUSTRATION_THRESHOLD) {
      // Frustrated: dominantly stuck → weight drops to let others try
      return base * (1 - FRUSTRATION_PENALTY);
    }
    return base;
  }

  /**
   * Evolve waves by one time step.
   *
   * Maslow Machines insight: lower need satisfaction creates upward pressure.
   * Voyager insight: tech tree is the natural curriculum for Minecraft.
   *
   * @param options.moved  Bot moved this tick → exploration satisfies curiosity.
   * @param options.techStage  0=empty, 1=raw wood, 2=tools started, 3=stone+
   */
  tick(options?: { moved?: boolean; techStage?: number }): void {
    this.prevState = { ...this.state };
    const techStage = options?.techStage ?? 0;
    const moved = options?.moved ?? false;

    // Phase 1: Standard decay for all levels
    for (const level of [1, 2, 3, 4, 5] as const) {
      let decay = DECAY_RATES[level];
      if (level === 2) decay += this.hormoneMods.adrenaline * 0.08;
      decay += this.hormoneMods.cortisol * 0.05;
      decay = Math.max(0.5, Math.min(0.99, decay));

      const baseline = level === 4 && techStage === 1 ? 0.15  // has wood → mild L4 pressure
        : level === 4 && techStage >= 2 ? 0.05                // has tools → low L4 baseline
        : this.effectiveBaseline(level);
      this.state[level] = baseline + (this.state[level] - baseline) * decay;
      if (this.state[level] < 0.01) this.state[level] = 0;
    }

    // Phase 2: Tech-tree-driven wave dynamics, NOT curiosity-as-boredom.
    //
    // From Maslow Machines: The "contentment trap" happens when agents are
    // comfortable (HP/Food full) but have no higher drives — they stagnate.
    // The fix: drive progression through the tech tree IS the higher drive.
    //
    // From Voyager: The tech tree provides a natural curriculum. Each tier
    // mastered unlocks the next. The agent's "curiosity" is really
    // "competence pursuit" — wanting to master the next tier.
    //
    // Implementation:
    //   techStage=0 (empty inv)    → all low, prerequisite handles wood
    //   techStage=1 (has wood)     → L4 builds (need to craft tools)
    //   techStage=2 (has tools)    → L4 for progression, L5 for exploration
    //   techStage=3 (stone+ tools) → L5 exploredrives further exploration

    switch (techStage) {
      case 0:
        // 空手: 没资格好奇, 生存前提会处理砍树
        this.state[5] = 0;
        break;

      case 1:
        // 有木头没工具: L4 工业欲上升(该造工具了), L5=0
        this.state[4] = Math.min(0.6, this.state[4] + 0.015);
        this.state[5] *= 0.95;
        break;

      case 2:
        // 有基础工具: 可以好奇了, L4 继续涨(L4下面还有更多科技)
        this.state[4] = Math.min(0.5, this.state[4] + 0.008);
        if (moved) {
          // 探索 = 满足好奇 → L5 下降
          this.state[5] *= 0.90;
        } else {
          // 闲着 → 轻微积累 (不是无聊, 是对下一级科技的渴望)
          this.state[5] = Math.min(0.6, this.state[5] + 0.008);
        }
        break;

      case 3:
        // 石镐+ : 基本生存已经OK, L5 主导探索高级资源
        if (moved) {
          this.state[5] *= 0.92;
        } else {
          this.state[5] = Math.min(0.8, this.state[5] + 0.012);
        }
        break;
    }

    // Phase 3: Wellbeing ceiling (Maslow Machines §4.1)
    // When L1 and L2 are both low AND bot has started toolmaking,
    // nudge L4/L5 slightly upward to prevent contentment trap.
    // Only applies when techStage >= 2 (toolmaking begun).
    if (techStage >= 2 && this.state[1] < 0.1 && this.state[2] < 0.1) {
      this.state[4] = Math.min(0.8, this.state[4] + 0.003);
      this.state[5] = Math.min(0.9, this.state[5] + 0.003);
    }
  }

  /** Dopamine boosts L5 baseline (curiosity/motivation) */
  private effectiveBaseline(level: 1|2|3|4|5): number {
    if (level === 5) return BASELINES[5] + this.hormoneMods.dopamine * 0.15;
    return BASELINES[level];
  }

  /** Classify wave phase from intensity + derivative */
  getPhase(level: 1|2|3|4|5): WavePhase {
    const i = this.state[level];
    const di = i - this.prevState[level];

    if (i < DORMANT_THRESHOLD) return 'DORMANT';
    if (di > 0.05) return 'RISING';
    if (i > PEAK_THRESHOLD && di <= 0.05 && di > -0.05) return 'PEAK';
    if (di > -0.05) return 'PEAK';  // stable near peak
    return 'DECAYING';
  }

  /** Highest-scoring need (intensity × hierarchical weight) */
  getDominant(): { level: 1|2|3|4|5; intensity: number } | null {
    let best: { level: 1|2|3|4|5; score: number } | null = null;
    for (const level of [1, 2, 3, 4, 5] as const) {
      const score = this.state[level] * this.effectiveWeight(level);
      if (!best || score > best.score) {
        best = { level, score };
      }
    }
    return best && best.score > 0
      ? { level: best.level, intensity: this.state[best.level] }
      : null;
  }

  /** Get frustration level for a need level (0 = none) */
  getFrustration(level: 1|2|3|4|5): number {
    return this.frustration[level];
  }
}
