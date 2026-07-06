// Brain Loop — 50ms tick 调度器
// 流式核心循环: 感知 → 反射 → 预测 → 习惯 → 认知 (异步)
// 参考: predictive-mind §8 main loop, xagent fused kernel

import { WorldSnapshot, TickResult } from './types';

export interface WorldInterface {
  perceive(): WorldSnapshot;
  act(action: any): void;
}

export interface BrainLoopConfig {
  tickInterval?: number;
  onTick?: (snapshot: WorldSnapshot) => Promise<TickResult | void>;
}

export class BrainLoop {
  private interval: number;
  private onTick?: (snapshot: WorldSnapshot) => Promise<TickResult | void>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private world: WorldInterface | null = null;
  private running = false;

  constructor(config: BrainLoopConfig) {
    this.interval = config.tickInterval ?? 50;
    this.onTick = config.onTick;
  }

  start(world: WorldInterface): void {
    if (this.running) return;
    this.world = world;
    this.running = true;

    this.timer = setInterval(async () => {
      if (!this.world || !this.running) return;
      const snapshot = this.world.perceive();
      if (this.onTick) {
        await this.onTick(snapshot);
      }
    }, this.interval);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
