// GoalManager — 目标管理 (替换旧的 GoalSystem)
// 支持 plan/step/interrupt/resume
// Maslow 层级: 1=生理, 2=安全, 3=社交, 4=尊重, 5=自我实现

export interface GoalPlan {
  description: string;
  plan: string[];
  maslowLevel?: number; // 1-5, 默认 4
}

export interface ActiveGoal {
  description: string;
  plan: string[];
  maslowLevel: number;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  createdAt: number;
  interruptedCount: number;
}

export class GoalManager {
  private _active: ActiveGoal | null = null;
  private _pending: { goal: ActiveGoal; suspendedAt: number } | null = null;

  /** 获取当前活跃目标 */
  get active(): ActiveGoal | null {
    return this._active;
  }

  /** 获取挂起的目标 */
  get pending(): ActiveGoal | null {
    return this._pending?.goal ?? null;
  }

  /** 当前执行的步骤名 */
  get currentStep(): string | null {
    if (!this._active || this._active.stepIndex >= this._active.plan.length) return null;
    return this._active.plan[this._active.stepIndex];
  }

  /** 设置新目标 */
  set(goal: GoalPlan): void {
    this._active = {
      description: goal.description,
      plan: [...goal.plan],
      maslowLevel: goal.maslowLevel ?? 4,
      stepIndex: 0,
      totalSteps: goal.plan.length,
      progress: 0,
      createdAt: Date.now(),
      interruptedCount: 0,
    };
  }

  /** 清除当前目标 */
  clear(): void {
    this._active = null;
  }

  /** 完成当前步骤, 前进到下一步
   *  @returns true = 还有剩余步骤, false = 所有步骤完成
   */
  stepComplete(): boolean {
    if (!this._active) return false;
    this._active.stepIndex++;
    this._active.progress = this._active.stepIndex / this._active.totalSteps;

    if (this._active.stepIndex >= this._active.totalSteps) {
      // 所有步骤完成, 不清除(等待外部 clear)
      return false;
    }
    return true;
  }

  /** 中断当前目标 (高优先级低层级打断高层级)
   *  @param bottleneckLevel — Maslow 瓶颈层级 (1 最高优先级)
   *  @returns true = 确实中断了, false = 未中断
   */
  interrupt(bottleneckLevel: number): boolean {
    if (!this._active) return false;

    // 只有更低层级(更高优先级)才能打断当前目标
    // L1 可以打断 L4, 但 L4 不能打断 L1
    if (bottleneckLevel < this._active.maslowLevel) {
      this._pending = { goal: { ...this._active }, suspendedAt: Date.now() };
      this._active = null;
      return true;
    }
    return false;
  }

  /** 恢复挂起的目标 */
  resume(): void {
    if (!this._pending || this._active) return;
    this._active = this._pending.goal;
    this._active.interruptedCount++;
    this._pending = null;
  }

  /** 检查当前目标是否被瓶颈阻塞
   *  @param bottleneckLevel — Maslow 瓶颈层级
   */
  isBlockedBy(bottleneckLevel: number): boolean {
    if (!this._active) return false;
    return bottleneckLevel < this._active.maslowLevel;
  }
}
