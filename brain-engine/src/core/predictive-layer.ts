// Predictive Layer — 预测编码引擎 (0 LLM, <1ms)
// 参考: xagent 7-stage pipeline, predictive-mind predict-before-act
// 接口设计: 现在用 PhysicsPredictor (A), 以后可换 LatentPredictor (B)

import {
  WorldSnapshot, Action, PredictedState, PredictionEngine,
  SurpriseSignal, CognitiveDemand,
} from './types';

export interface PredictiveLayerConfig {
  surpriseThreshold?: number;
  decayFactor?: number;
}

/**
 * PhysicsPredictor — 基于物理惯性的预测 (选项 A)
 * O(1) 计算，0 训练，0 LLM
 */
export class PhysicsPredictor implements PredictionEngine {
  private dt = 0.05; // 50ms tick

  predict(prev: WorldSnapshot, _action?: Action): PredictedState {
    return {
      position: {
        x: prev.position.x + prev.velocity.x * this.dt,
        y: prev.position.y + prev.velocity.y * this.dt,
        z: prev.position.z + prev.velocity.z * this.dt,
      },
      health: prev.health + (prev.healthDelta || 0) * this.dt,
      threats: (prev.entities || [])
        .filter(e => e.type === 'zombie' || e.type === 'skeleton')
        .map(e => ({
          id: e.id,
          distance: Math.sqrt(
            (e.position.x - prev.position.x) ** 2 +
            (e.position.z - prev.position.z) ** 2
          ),
        })),
      confidence: 0.9,
    };
  }

  confidence(): number { return 0.9; }
}

/**
 * PredictiveLayer — 预测编码核心
 * 每个 tick: 预测 → 比较 → 决策是否需要认知唤醒
 * 激素影响: cortisol ↑ → 阈值↓(更敏感), endorphin ↑ → 阈值↑(放松)
 */
export class PredictiveLayer {
  private engine: PredictionEngine;
  private threshold: number;
  private decayFactor: number;
  private lastPrediction: PredictedState | null = null;
  private surpriseHistory: number[] = [];
  private maxHistory = 20;
  private hormone?: { modulateSurpriseThreshold(base: number): number };

  constructor(config: PredictiveLayerConfig = {}) {
    this.engine = new PhysicsPredictor();
    this.threshold = config.surpriseThreshold ?? 0.3;
    this.decayFactor = config.decayFactor ?? 0.95;
  }

  /** 注入激素系统用于阈值调制 */
  setHormone(h: { modulateSurpriseThreshold(base: number): number }): void {
    this.hormone = h;
  }

  /** 切换预测引擎 (Physics → Latent) */
  useEngine(engine: PredictionEngine): void {
    this.engine = engine;
  }

  /** 核心 tick: 预测 → 比较 → 返回认知需求 */
  tick(snapshot: WorldSnapshot): CognitiveDemand {
    const prediction = this.engine.predict(snapshot);

    if (!this.lastPrediction) {
      this.lastPrediction = prediction;
      return { level: 'none' };
    }

    const surprise = this.computeSurprise(this.lastPrediction, snapshot);
    this.surpriseHistory.push(surprise.total);
    if (this.surpriseHistory.length > this.maxHistory) {
      this.surpriseHistory.shift();
    }

    this.lastPrediction = prediction;

    // 用激素调制阈值
    const effectiveThreshold = this.hormone
      ? this.hormone.modulateSurpriseThreshold(this.threshold)
      : this.threshold;

    if (surprise.total < effectiveThreshold) {
      return { level: 'predictive_pass' };
    }

    return {
      level: 'cognitive',
      surprise,
      attention: Math.min(1, surprise.total * 2),
    };
  }

  /** 平均 surprise — 用于 DMN 判断 */
  get averageSurprise(): number {
    if (this.surpriseHistory.length === 0) return 0;
    const sum = this.surpriseHistory.reduce((a, b) => a + b, 0);
    return sum / this.surpriseHistory.length;
  }

  private computeSurprise(pred: PredictedState, actual: WorldSnapshot): SurpriseSignal {
    const posError = Math.abs(pred.position.x - actual.position.x) +
      Math.abs(pred.position.y - actual.position.y) +
      Math.abs(pred.position.z - actual.position.z);
    const healthError = Math.abs(pred.health - actual.health) / Math.max(actual.health, 1);
    const threatError = pred.threats.length > 0 ? 0.1 : 0;

    const dimensions = {
      position: Math.min(1, posError / 10),
      health: Math.min(1, healthError),
      threat: Math.min(1, threatError),
      inventory: 0,
    };

    const total = (
      dimensions.position * 0.4 +
      dimensions.health * 0.3 +
      dimensions.threat * 0.2 +
      dimensions.inventory * 0.1
    );

    return {
      total: Math.min(1, total),
      dimensions,
      attention: Math.min(1, total * 2),
    };
  }
}
