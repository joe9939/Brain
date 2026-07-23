// Goal System â€?Â§1.3A: Goal management
// M^goal â€?tracks active/completed goals, enables planning

import { Goal, GoalState } from './types.js';

export class GoalSystem {
  static default(): GoalState {
    return { active: [], completed: 0, history: [] };
  }

  add(state: GoalState, description: string, priority = 5): Goal {
    const goal: Goal = {
      id: `g-${Date.now()}`,
      description,
      status: 'active',
      priority,
      created: Date.now(),
    };
    state.active.push(goal);
    return goal;
  }

  complete(state: GoalState, goalId: string): void {
    const idx = state.active.findIndex(g => g.id === goalId);
    if (idx === -1) return;
    const goal = state.active[idx];
    goal.status = 'completed';
    goal.completedAt = Date.now();
    state.history.push(goal);
    state.active.splice(idx, 1);
    state.completed++;
  }

  fail(state: GoalState, goalId: string): void {
    const idx = state.active.findIndex(g => g.id === goalId);
    if (idx === -1) return;
    state.active[idx].status = 'failed';
    state.active.splice(idx, 1);
  }
}
