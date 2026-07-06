// Habit Layer — 习惯在线学习 (0 LLM, ~10ms)
// 频率跟踪: 重复触发 → 自动固化 → 习惯响应
// 参考: brain v2 现有 SOP 系统 + 在线学习

import { Action, Habit } from './types';

export class HabitLayer {
  private habits: Map<string, Habit> = new Map();
  private successCount: Map<string, number> = new Map();
  private failCount: Map<string, number> = new Map();

  /** 学习一个习惯：trigger → action */
  learn(trigger: string, action: Action): void {
    const existing = this.habits.get(trigger);
    if (existing) {
      existing.frequency++;
      existing.lastUsed = Date.now();
    } else {
      this.habits.set(trigger, {
        id: `habit-${this.habits.size + 1}`,
        trigger,
        action,
        frequency: 1,
        lastUsed: Date.now(),
        successRate: 0.5,
      });
      this.successCount.set(trigger, 0);
      this.failCount.set(trigger, 0);
    }
  }

  /** 记录习惯执行结果 */
  recordSuccess(trigger: string, success: boolean): void {
    const habit = this.habits.get(trigger);
    if (!habit) return;
    if (success) {
      this.successCount.set(trigger, (this.successCount.get(trigger) || 0) + 1);
    } else {
      this.failCount.set(trigger, (this.failCount.get(trigger) || 0) + 1);
    }
    const total = (this.successCount.get(trigger) || 0) + (this.failCount.get(trigger) || 0);
    habit.successRate = total > 0 ? (this.successCount.get(trigger) || 0) / total : 0.5;
  }

  /** 匹配习惯 — 返回最高频的匹配 */
  match(input: string): Habit | null {
    let best: Habit | null = null;
    let bestScore = 0;

    for (const [, habit] of this.habits) {
      let score = 0;
      // Exact match
      if (input === habit.trigger) {
        score = 100 + habit.frequency;
      }
      // Contains match
      else if (input.includes(habit.trigger) || habit.trigger.includes(input)) {
        score = habit.frequency * 10;
      }
      // Partial word match
      else {
        const words = input.toLowerCase().split(/\s+/);
        const triggerWords = habit.trigger.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => triggerWords.includes(w)).length;
        if (overlap > 0) score = overlap * habit.frequency * 5;
      }

      if (score > bestScore) {
        bestScore = score;
        best = habit;
      }
    }

    return best;
  }

  /** 统计信息 */
  stats(): { total: number; frequent: number } {
    let frequent = 0;
    for (const [, habit] of this.habits) {
      if (habit.frequency >= 5) frequent++;
    }
    return { total: this.habits.size, frequent };
  }
}
