// Brain Loop — 50ms tick scheduler
// Streaming core: perceive → reflex → predict → habit → cognitive (async)

import { WorldSnapshot, TickResult } from './types.js';
import type { WorldInterface } from '../../../world-interface/interface.js';

export type { WorldInterface };

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

    const loop = async () => {
      if (!this.world || !this.running) return;
      const snapshot = await this.world.perceive();
      if (this.onTick) {
        await this.onTick(snapshot);
      }
      // 等当前 tick 完全跑完, 再安排下一个
      // 避免 setInterval 并发执行 (find_wood 的 await bot.dig 要 1 秒)
      this.timer = setTimeout(loop, this.interval) as any;
    };
    this.timer = setTimeout(loop, this.interval) as any;
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
