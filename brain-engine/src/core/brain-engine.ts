// Brain Engine v2 — Main orchestrator
// Integrates all modules: Perception → Cognition → Action (§1.3A)
// arXiv 2504.01990v2 complete implementation

import { MentalState, ComponentOutput, GateResult } from './types';
import { SessionPool } from './session-pool';
import { BasalGanglia } from './basal-ganglia';
import { MemorySystem } from './memory';
import { EmotionEngine } from './emotion';
import { RewardSystem } from './reward';
import { WorldModel } from './world-model';
import { GoalSystem } from './goal';

export class BrainEngine {
  readonly sessionPool: SessionPool;
  readonly basalGanglia: BasalGanglia;
  readonly memory: MemorySystem;
  readonly emotion: EmotionEngine;
  readonly reward: RewardSystem;
  readonly worldModel: WorldModel;
  readonly goals: GoalSystem;

  state: MentalState;

  constructor(config: { apiKey: string; baseUrl: string; model: string }) {
    this.sessionPool = new SessionPool(config);
    this.basalGanglia = new BasalGanglia();
    this.memory = new MemorySystem();
    this.emotion = new EmotionEngine();
    this.reward = new RewardSystem();
    this.worldModel = new WorldModel();
    this.goals = new GoalSystem();

    this.state = {
      mem: { working: [], episodic: [], semantic: [], procedural: [] },
      wm: WorldModel.default(),
      emo: EmotionEngine.default(),
      goal: GoalSystem.default(),
      rew: RewardSystem.default(),
    };
  }

  /**
   * Process input through the full Perception–Cognition–Action loop
   * §1.3A: The Agent Loop
   */
  async process(input: string): Promise<{ output: string; gate: GateResult; signals: any }> {
    // ── 1. Thalamus: input routing ──
    const urgency = this.detectUrgency(input);

    // ── 2. Reflex Arc: safety first ──
    const reflexBlock = this.reflexCheck(input);
    if (reflexBlock) {
      return { output: reflexBlock, gate: { allowAll: false, allowedTools: [], reason: 'reflex block', signal: 'safety' }, signals: {} };
    }

    // ── 3. Emotion update ──
    this.state.emo = this.emotion.update(this.state.emo, input);

    // ── 4. Add to working memory ──
    this.memory.addToWorking(this.state, input);

    // ── 5. Signal competition ──
    const signals = this.basalGanglia.computeSignals(this.state);
    const winner = this.basalGanglia.getWinner(this.state);

    // ── 6. Cognitive processing (L1 parallel) ──
    const l1Results = await this.runL1(input);

    // ── 7. Gate determination ──
    const gate = this.basalGanglia.getGate(this.state, 'task');

    // ── 8. Update reward (basic) ──
    this.state.rew = this.reward.update(this.state.rew, { success: true });

    // ── 9. Goal tracking ──
    if (!this.state.goal.active.find(g => g.description === input.slice(0, 50))) {
      this.goals.add(this.state.goal, input.slice(0, 100));
    }

    return {
      output: this.formatOutput(l1Results, winner),
      gate,
      signals,
    };
  }

  /**
   * L1 Perception — 5 parallel components (§2.1)
   */
  private async runL1(input: string): Promise<Map<string, ComponentOutput>> {
    const l1Components = [
      { id: 'thalamus', label: '📡 Thalamus', sessionId: 'br-thalamus', prompt: 'You are the sensory gate. Analyze input for urgency, gate status, and intent.', run: async () => ({ componentId: 'thalamus', summary: 'Input analyzed', signals: { perceive: 0 }, state: {} }) },
      { id: 'amygdala', label: '❤️ Amygdala', sessionId: 'br-amygdala', prompt: 'You detect emotion. Output mode (NORMAL/CAUTION/URGENT/EXPLORE/SUPPORT) and intensity.', run: async () => ({ componentId: 'amygdala', summary: 'Emotion detected', signals: { emotion: 0 }, state: {} }) },
      { id: 'hippocampus', label: '💾 Hippocampus', sessionId: 'br-hippocampus', prompt: 'You retrieve relevant memories, SOPs, and past experiences.', run: async () => ({ componentId: 'hippocampus', summary: 'Memory retrieved', signals: { memory: 0 }, state: {} }) },
      { id: 'world-cortex', label: '🌍 World Cortex', sessionId: 'br-world', prompt: 'You analyze codebase context and predict impact.', run: async () => ({ componentId: 'world-cortex', summary: 'Context analyzed', signals: { perceive: 0 }, state: {} }) },
      { id: 'safety', label: '🛡️ Safety', sessionId: 'br-safety', prompt: 'You scan for security risks.', run: async () => ({ componentId: 'safety', summary: 'Safety scan complete', signals: { safety: 0 }, state: {} }) },
    ];

    return this.sessionPool.runAll(l1Components, input, this.state);
  }

  private reflexCheck(input: string): string | null {
    const dangers = [/rm\s+-rf\s+\//i, /dd\s+if=/i, /mkfs\./i, /fdisk/i, /:\(\)\s*\{/i];
    for (const d of dangers) {
      if (d.test(input)) return `🚫 G1 BLOCK: dangerous command prevented (${d.source})`;
    }
    return null;
  }

  private detectUrgency(input: string): number {
    const urgent = [/urgent|紧急|asap|immediately/i];
    return urgent.some(u => u.test(input)) ? 0.9 : 0.1;
  }

  private formatOutput(l1Results: Map<string, ComponentOutput>, winner: any): string {
    const summaries = Array.from(l1Results.values())
      .map(r => `  ${r.componentId}: ${r.summary}`)
      .join('\n');
    const winStr = winner ? `[${winner.key}] ${winner.label} = ${winner.strength}` : 'idle';
    return `🧠 Signal: ${winStr}\n\nL1 Results:\n${summaries}`;
  }
}
