// AgentLoop — 马斯洛 Agent 主循环
// perceive → Maslow → Goal → Execute/LLM → loop
// 所有 bot 行为的总框架

import { MaslowSystem, MaslowReport } from './maslow-system.js';
import { GoalManager } from './goal-manager.js';
import { EventBuffer } from '../../../world-interface/event-buffer.js';
import { BotEvent } from '../../../world-interface/types.js';
import { WorldSnapshot } from './types.js';

export interface AgentStepResult {
  success: boolean;
  error?: string;
}

export interface LastActionResult {
  action: string;
  success: boolean;
  error?: string;
  timestamp: number;
  posChanged?: boolean;
}

export interface LLMContext {
  snapshot: WorldSnapshot;
  events: BotEvent[];
  maslow: MaslowReport;
  goal: { description: string; progress: number; stepIndex: number } | null;
  lastActionResult: LastActionResult | null;
}

export interface AgentLoopDeps {
  perceive: () => Promise<WorldSnapshot>;
  executeStep: (step: string) => Promise<AgentStepResult>;
  askLLM: (context: LLMContext) => Promise<string | null>;
  intervalMs?: number;
}

export class AgentLoop {
  readonly maslow: MaslowSystem;
  readonly goalManager: GoalManager;
  readonly eventBuffer: EventBuffer;

  private deps: AgentLoopDeps;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private busy = false;
  private lastAction: LastActionResult | null = null;

  constructor(deps: AgentLoopDeps) {
    this.deps = deps;
    this.maslow = new MaslowSystem();
    this.goalManager = new GoalManager();
    this.eventBuffer = new EventBuffer();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const ms = this.deps.intervalMs ?? 3000;
    this.timer = setInterval(() => this.tick(), ms);
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  isRunning(): boolean {
    return this.running;
  }

  /** 单次 tick — 公开给测试和外部调用 */
  async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const snapshot = await this.deps.perceive();
      const events = this.eventBuffer.flush();
      const report = this.maslow.evaluate(snapshot, {
        activeGoal: this.goalManager.active ?? undefined,
      });

      // 1. 瓶颈检查 → 中断当前目标
      if (report.bottleneck !== null && this.goalManager.isBlockedBy(report.bottleneck)) {
        this.goalManager.interrupt(report.bottleneck);
      }

      // 2. 有活跃目标步骤 → 执行
      const currentStep = this.goalManager.currentStep;
      if (currentStep) {
        const posBefore = { ...snapshot.position };
        const stepResult = await this.deps.executeStep(currentStep);
        // 检查位置是否变化
        const newSnapshot = await this.deps.perceive();
        const posChanged =
          Math.floor(posBefore.x) !== Math.floor(newSnapshot.position.x) ||
          Math.floor(posBefore.y) !== Math.floor(newSnapshot.position.y) ||
          Math.floor(posBefore.z) !== Math.floor(newSnapshot.position.z);
        this.lastAction = {
          action: currentStep,
          success: stepResult.success,
          error: stepResult.error,
          timestamp: Date.now(),
          posChanged,
        };
        if (stepResult.success) {
          this.goalManager.stepComplete();
        }
        return;
      }

      // 3. 无目标 → 调 LLM 决策
      const llmResult = await this.deps.askLLM({
        snapshot,
        events,
        maslow: report,
        lastActionResult: this.lastAction,
        goal: this.goalManager.pending
          ? { description: this.goalManager.pending.description, progress: this.goalManager.pending.progress, stepIndex: this.goalManager.pending.stepIndex }
          : null,
      });

      if (!llmResult) return;

      // 去掉 markdown 代码块 ```json ... ```
      const cleanResult = llmResult.replace(/```(?:json)?\n?/gi, '').trim();
      const trimmed = cleanResult;

      // Handle ["resume"]
      if (trimmed === '["resume"]' || trimmed === 'resume') {
        this.goalManager.resume();
        return;
      }

      // Handle ["done"]
      if (trimmed === '["done"]' || trimmed === 'done') {
        this.goalManager.clear();
        return;
      }

      // Handle JSON array plan
      if (trimmed.startsWith('[')) {
        try {
          const plan: string[] = JSON.parse(trimmed);
          if (Array.isArray(plan) && plan.length > 0) {
            const goalLevel = report.bottleneck && report.bottleneck <= 3
              ? report.bottleneck
              : 4;
            this.goalManager.set({
              description: plan.join(' → '),
              plan,
              maslowLevel: goalLevel,
            });
          }
        } catch { /* invalid JSON, ignore */ }
        return;
      }

      // Handle single action
      const action = trimmed.toLowerCase().replace(/[^a-z_]/g, '');
      if (action) {
        const goalLevel = report.bottleneck && report.bottleneck <= 3
          ? report.bottleneck
          : 4;
        this.goalManager.set({
          description: action,
          plan: [action],
          maslowLevel: goalLevel,
        });
      }
    } finally {
      this.busy = false;
    }
  }
}
