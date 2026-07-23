// Basal Ganglia โ€?ยง3.3.4: Signal competition + Go/NoGo gate
// arXiv 2504.01990v2: The winning signal determines action selection

import { MentalState, SignalResult, GateResult, TOOL_MAP, ToolCategory } from './types.js';

interface SignalDef {
  key: string;
  label: string;
  priority: number;
  compute: (state: MentalState) => number;  // raw strength
}

const SIGNALS: SignalDef[] = [
  // ยง2.1 L1 Perception
  {
    key: 'perceive',
    label: 'L1 Perception',
    priority: 5,
    compute: (s) => {
      // perceive = 1.0 - L1.size ร— 0.15 (when L1 not complete)
      const l1Size = s.mem.working.length;
      return l1Size < 5 ? Math.max(0, 1.0 - l1Size * 0.15) : 0;
    },
  },
  // ยง2.5 Emotion modeling
  {
    key: 'emotion',
    label: 'Emotion',
    priority: 4,
    compute: (s) => {
      const m = s.emo;
      if (m.mode === 'CAUTION' || m.mode === 'URGENT') return 0.9;
      return m.intensity * 0.5;
    },
  },
  // ยง5 Safety
  {
    key: 'safety',
    label: 'Safety Gate',
    priority: 4,
    compute: (s) => s.emo.mode === 'CAUTION' ? 0.9 : 0,
  },
  // ยง2.2 Memory system
  {
    key: 'memory',
    label: 'Memory Retrieval',
    priority: 3,
    compute: (s) => {
      const sopCount = s.mem.procedural.length;
      const epCount = s.mem.episodic.length;
      return sopCount > 0 ? 0.8 : epCount > 0 ? 0.5 : 0;
    },
  },
  // ยง2.4 Reward/learning
  {
    key: 'reward',
    label: 'Reward Evaluation',
    priority: 3,
    compute: (s) => {
      const r = s.rew;
      if (r.score < 3) return 0.8;
      if (Math.abs(r.td_error) > 1) return 0.6;
      return 0;
    },
  },
  // ยง2.7 Action/swarm
  {
    key: 'action',
    label: 'Action Execution',
    priority: 2,
    compute: (s) => s.goal.active.length > 0 ? 0.8 : 0,
  },
  // ยง3 Self-enhancement/learning
  {
    key: 'learning',
    label: 'POST Learning',
    priority: 1,
    compute: (s) => (s.goal.completed > 0 && s.mem.working.length >= 5) ? 0.7 : 0,
  },
];

export class BasalGanglia {
  /**
   * Compute all signal strengths โ€?ยง2.4
   * Returns sorted results, winner first
   */
  computeSignals(state: MentalState): SignalResult[] {
    const results = SIGNALS.map(sig => {
      const raw = sig.compute(state);
      return {
        key: sig.key,
        label: sig.label,
        raw: Math.round(raw * 100) / 100,
        priority: sig.priority,
        strength: Math.round(raw * sig.priority * 100) / 100,
      };
    });

    // Sort descending by strength
    results.sort((a, b) => b.strength - a.strength);
    return results;
  }

  /**
   * Get the winning signal
   */
  getWinner(state: MentalState): SignalResult | null {
    const signals = this.computeSignals(state);
    // Only return winner if strength is significant (โ?.5) to avoid noise
    return signals[0]?.strength >= 0.5 ? signals[0] : null;
  }

  /**
   * Basal Ganglia gate โ€?ยง3.3.4 Go/NoGo
   * The winning signal determines which tools are allowed
   */
  getGate(state: MentalState, tool: string): GateResult {
    const winner = this.getWinner(state);
    if (!winner) return { allowAll: true, reason: 'idle', signal: null };

    const toolCat = TOOL_MAP[tool] || tool as any;

    switch (winner.key) {
      case 'perceive':
        return {
          allowAll: false,
          allowedTools: ['task'],
          reason: `L1 perception incomplete (${state.mem.working.length}/5)`,
          signal: 'perceive',
        };

      case 'safety':
      case 'emotion':
        if (state.emo.mode === 'CAUTION' || winner.key === 'safety') {
          return {
            allowAll: false,
            allowedTools: ['task', 'read', 'grep', 'glob', 'look_at'],
            reason: `${winner.key} mode โ€?read only`,
            signal: winner.key,
          };
        }
        return { allowAll: true, reason: 'normal', signal: winner.key };

      case 'memory':
        return {
          allowAll: false,
          allowedTools: ['task', 'read', 'grep', 'glob'],
          reason: 'memory retrieval in progress',
          signal: 'memory',
        };

      case 'reward':
        return {
          allowAll: false,
          allowedTools: ['task', 'read', 'grep', 'glob'],
          reason: `low score (${state.rew.score}) โ€?deep reasoning needed`,
          signal: 'reward',
        };

      case 'action':
        return { allowAll: true, reason: 'execution mode', signal: 'action' };

      case 'learning':
        return {
          allowAll: false,
          allowedTools: ['task'],
          reason: 'post-task reflection',
          signal: 'learning',
        };

      default:
        return { allowAll: true, reason: 'default', signal: winner.key };
    }
  }

  /**
   * Check if a specific tool is allowed
   */
  isToolAllowed(state: MentalState, tool: string): { allowed: boolean; reason: string } {
    const gate = this.getGate(state, tool);
    if (gate.allowAll) return { allowed: true, reason: 'allowed' };
    const isAllowed = gate.allowedTools!.some(t => tool === t || tool.startsWith(t));
    return {
      allowed: isAllowed,
      reason: isAllowed ? 'allowed' : gate.reason,
    };
  }
}
