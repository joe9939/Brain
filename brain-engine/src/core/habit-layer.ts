// Habit Layer — Online habit learning + Skill Memory
// Reference: brain v2 SOP system + Skill acquisition via practice

import { Action, Habit } from './types';

export interface SkillDetail {
  trigger: string;
  tool?: string;
  durationMs?: number;
  result?: string;
  context?: string;
  frequency: number;
  successRate: number;
  bestTool?: string;
  bestDuration?: number;
  lastUsed: number;
}

export class HabitLayer {
  private habits: Map<string, Habit> = new Map();
  private successCount: Map<string, number> = new Map();
  private failCount: Map<string, number> = new Map();
  // Skill Memory: trigger → detailed skill info
  private skills: Map<string, SkillDetail> = new Map();

  // ── Legacy Habit Learning ──
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

  match(input: string): Habit | null {
    let best: Habit | null = null;
    let bestScore = 0;
    for (const [, habit] of this.habits) {
      let score = 0;
      if (input === habit.trigger) {
        score = 100 + habit.frequency;
      } else if (input.includes(habit.trigger) || habit.trigger.includes(input)) {
        score = habit.frequency * 10;
      } else {
        const words = input.toLowerCase().split(/\s+/);
        const triggerWords = habit.trigger.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => triggerWords.includes(w)).length;
        if (overlap > 0) score = overlap * habit.frequency * 5;
      }
      if (score > bestScore) { bestScore = score; best = habit; }
    }
    return best;
  }

  // ── Skill Memory (NEW) ──

  /** Learn a skill with execution details */
  learnSkill(trigger: string, action: Action, details: {
    tool?: string;
    durationMs?: number;
    result?: string;
    context?: string;
  }): void {
    // Also trigger legacy learn for habit tracking
    this.learn(trigger, action);

    const existing = this.skills.get(trigger);
    if (existing) {
      existing.frequency++;
      existing.lastUsed = Date.now();
      if (details.tool) existing.tool = details.tool;
      if (details.durationMs != null) {
        if (existing.bestDuration == null || details.durationMs < existing.bestDuration) {
          existing.bestDuration = details.durationMs;
          existing.bestTool = details.tool || existing.bestTool;
        }
        existing.durationMs = details.durationMs;
      }
      if (details.result) existing.result = details.result;
      if (details.context) existing.context = details.context;
    } else {
      this.skills.set(trigger, {
        trigger,
        tool: details.tool,
        durationMs: details.durationMs,
        result: details.result,
        context: details.context,
        frequency: 1,
        successRate: 0.5,
        bestTool: details.tool,
        bestDuration: details.durationMs,
        lastUsed: Date.now(),
      });
    }
  }

  /** Learn from outcome: records both params and success/failure */
  learnFromOutcome(trigger: string, action: Action, outcome: {
    tool?: string;
    durationMs?: number;
    result?: string;
    success: boolean;
  }): void {
    this.learnSkill(trigger, action, outcome);
    if (outcome.success) {
      this.recordSuccess(trigger, true);
      const skill = this.skills.get(trigger);
      if (skill) skill.successRate = (this.successCount.get(trigger) || 0) /
        Math.max(1, (this.successCount.get(trigger) || 0) + (this.failCount.get(trigger) || 0));
    } else {
      this.recordSuccess(trigger, false);
    }
  }

  /** Get skill details for a trigger */
  getSkill(trigger: string): SkillDetail | null {
    return this.skills.get(trigger) ?? null;
  }

  /** Get all skill details */
  getAllSkillDetails(): SkillDetail[] {
    return Array.from(this.skills.values());
  }

  stats(): { total: number; frequent: number; skills: number } {
    let frequent = 0;
    for (const [, habit] of this.habits) {
      if (habit.frequency >= 5) frequent++;
    }
    return { total: this.habits.size, frequent, skills: this.skills.size };
  }
}
