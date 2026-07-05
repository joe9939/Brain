// Brain Engine v2 — Main orchestrator
// arXiv 2504.01990v2 §1.3A: Perception→Cognition→Action loop
// Output routing: winning signal decides which component produces the output

import { MentalState, OutputRouter, GateResult } from './types';
import { SessionPool } from './session-pool';
import { BasalGanglia } from './basal-ganglia';
import { MemorySystem } from './memory';
import { EmotionEngine } from './emotion';
import { RewardSystem } from './reward';
import { WorldModel } from './world-model';
import { GoalSystem } from './goal';
import { LLMClient } from './llm-client';
import { Persistence } from './persistence';

export interface BrainEngineConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  persistencePath?: string;
}

export class BrainEngine {
  readonly sessionPool: SessionPool;
  readonly basalGanglia: BasalGanglia;
  readonly memory: MemorySystem;
  readonly emotion: EmotionEngine;
  readonly reward: RewardSystem;
  readonly worldModel: WorldModel;
  readonly goals: GoalSystem;
  readonly persistence?: Persistence;
  private llm: LLMClient;

  state: MentalState;

  constructor(config: BrainEngineConfig) {
    this.sessionPool = new SessionPool(config);
    this.basalGanglia = new BasalGanglia();
    this.memory = new MemorySystem();
    this.emotion = new EmotionEngine();
    this.reward = new RewardSystem();
    this.worldModel = new WorldModel();
    this.goals = new GoalSystem();
    this.llm = new LLMClient(config);

    if (config.persistencePath) {
      this.persistence = new Persistence(config.persistencePath);
    }

    this.state = {
      mem: { working: [], episodic: [], semantic: [], procedural: [] },
      wm: WorldModel.default(),
      emo: EmotionEngine.default(),
      goal: GoalSystem.default(),
      rew: RewardSystem.default(),
    };
  }

  /**
   * Process input through full Perception–Cognition–Action loop
   * Output routed by winning signal (§2.7)
   */
  async process(input: string): Promise<{
    output: string;
    gate: GateResult;
    signals: any;
    outputRouter: OutputRouter;
  }> {
    const start = Date.now();

    // ── 1. Reflex Arc: safety first (§5) ──
    const reflexBlock = this.reflexCheck(input);
    if (reflexBlock) {
      return {
        output: reflexBlock,
        gate: { allowAll: false, allowedTools: [], reason: 'reflex block', signal: 'safety' },
        signals: [],
        outputRouter: { component: 'reflex', signal: 'safety', usedLLM: false, model: 'none', latency: Date.now() - start },
      };
    }

    // ── 2. Emotion update (§2.5) ──
    this.state.emo = this.emotion.update(this.state.emo, input);

    // ── 3. Working memory update (§2.2) ──
    this.memory.addToWorking(this.state, input);

    // ── 4. Signal competition (§2.4) ──
    const signals = this.basalGanglia.computeSignals(this.state);
    const winner = this.basalGanglia.getWinner(this.state);

    // ── 5. L1 Perception — 5 parallel components (§2.1) ──
    const l1Results = await this.runL1(input);

    // ── 6. Recompute signals after L1 ──
    const postL1Signals = this.basalGanglia.computeSignals(this.state);
    const finalWinner = this.basalGanglia.getWinner(this.state);

    // ── 7. Gate determination (§3.3.4) ──
    const gate = this.basalGanglia.getGate(this.state, 'task');

    // ── 8. Update reward (§2.4) ──
    this.state.rew = this.reward.update(this.state.rew, { success: true });

    // ── 9. Goal tracking (§1.3A) ──
    if (!this.state.goal.active.find(g => g.description === input.slice(0, 50))) {
      this.goals.add(this.state.goal, input.slice(0, 100));
    }

    // ── 10. Persist state (§2.2, §3) ──
    if (this.persistence) {
      this.persistence.saveEpisodic({
        id: `ep-${Date.now()}`,
        timestamp: Date.now(),
        content: `Input: ${input.slice(0, 200)}\nOutput: routed to ${finalWinner?.key || 'brain'}`,
        importance: this.state.emo.intensity > 0.5 ? 0.7 : 0.3,
        tags: ['interaction', finalWinner?.key || 'brain'],
      });
    }

    // ── 11. Output routing: winner decides which component outputs ──
    const outputResult = await this.routeOutput(finalWinner, input, l1Results, start);

    return {
      output: outputResult.text,
      gate,
      signals: postL1Signals,
      outputRouter: outputResult.router,
    };
  }

  /**
   * Route output based on winning signal (§2.7)
   * Perceive/brain → LLM brain agent synthesizes
   * Safety → reflex (no LLM)
   * Action → swarm execution
   * Learning → reflection
   * Default → LLM brain agent
   */
  private async routeOutput(
    winner: any, input: string, l1Results: Map<string, any>, start: number
  ): Promise<{ text: string; router: OutputRouter }> {
    const winnerKey = winner?.key || 'none';
    const l1Summary = Array.from(l1Results.values()).map(r =>
      `[${r.componentId}] ${r.summary?.slice(0, 100) || 'completed'}`
    ).join('\n');

    // ── Perceive → brain synthesizes ──
    if (winnerKey === 'perceive' || winnerKey === 'none' || winnerKey === 'emotion' || winnerKey === 'memory' || winnerKey === 'reward') {
      const result = await this.llm.complete([
        { role: 'system', content: `You are the Brain — executive integrator (§1.3A).
Synthesize these L1 perception results into a natural, helpful response.
Do NOT mention L1, signals, or brain components to the user.
Just respond helpfully and naturally.

## L1 Perception Results
${l1Summary}

## Current Mode
Emotion: ${this.state.emo.mode}
Signal: ${winnerKey} ${winner?.strength || ''}` },
        { role: 'user', content: input },
      ]);
      return {
        text: result.content,
        router: { component: 'brain', signal: winnerKey, usedLLM: true, model: result.model, latency: Date.now() - start },
      };
    }

    // ── Safety → direct message (no LLM) ──
    if (winnerKey === 'safety') {
      return {
        text: `🛡️ Safety mode active. Input is restricted.`,
        router: { component: 'reflex', signal: 'safety', usedLLM: false, model: 'none', latency: Date.now() - start },
      };
    }

    // ── Action → swarm executes ──
    if (winnerKey === 'action') {
      const result = await this.llm.complete([
        { role: 'system', content: `You are the Swarm Executor — you execute complex tasks.
You have access to: planning, coding, reviewing, and testing.
Output the result of execution naturally.` },
        { role: 'user', content: input },
      ]);
      return {
        text: result.content,
        router: { component: 'swarm', signal: 'action', usedLLM: true, model: result.model, latency: Date.now() - start },
      };
    }

    // ── Learning → reflection ──
    if (winnerKey === 'learning') {
      const result = await this.llm.complete([
        { role: 'system', content: `You are in POST-learning mode (§3).
Reflect on recent interactions. Extract lessons. Consolidate knowledge.
Then answer the user naturally.` },
        { role: 'user', content: input },
      ]);
      return {
        text: result.content,
        router: { component: 'brain', signal: 'learning', usedLLM: true, model: result.model, latency: Date.now() - start },
      };
    }

    // ── Default: brain ──
    const result = await this.llm.complete([
      { role: 'system', content: `You are a helpful AI assistant. Respond naturally to the user.` },
      { role: 'user', content: input },
    ]);
    return {
      text: result.content,
      router: { component: 'brain', signal: winnerKey, usedLLM: true, model: result.model, latency: Date.now() - start },
    };
  }

  private async runL1(input: string): Promise<Map<string, any>> {
    const l1Components = [
      { id: 'thalamus', label: '📡 Thalamus', sessionId: 'br-thalamus', model: undefined, prompt: 'You are the sensory gate. Analyze input for urgency, gate status, and intent.\nRespond in JSON: { signals: { perceive: 0.8 }, summary: "..." }', run: async () => ({}) },
      { id: 'amygdala', label: '❤️ Amygdala', sessionId: 'br-amygdala', model: undefined, prompt: 'You detect emotion and mood. Analyze: mode(NORMAL/CAUTION/URGENT/EXPLORE/SUPPORT), intensity, valence, arousal.\nRespond in JSON: { signals: { emotion: 0.5 }, state: { emo: { mode: "NORMAL" } }, summary: "..." }', run: async () => ({}) },
      { id: 'hippocampus', label: '💾 Hippocampus', sessionId: 'br-hippocampus', model: undefined, prompt: 'You retrieve relevant memories, patterns, and past experiences.\nRespond in JSON: { signals: { memory: 0.3 }, summary: "..." }', run: async () => ({}) },
      { id: 'world-cortex', label: '🌍 World Cortex', sessionId: 'br-world', model: undefined, prompt: 'You analyze context and predict impact.\nRespond in JSON: { signals: {}, summary: "..." }', run: async () => ({}) },
      { id: 'safety', label: '🛡️ Safety', sessionId: 'br-safety', model: undefined, prompt: 'You scan for security risks, dangerous commands, and sensitive data.\nRespond in JSON: { signals: { safety: 0.1 }, summary: "Risk: none" }', run: async () => ({}) },
    ];
    return this.sessionPool.runAll(l1Components, input, this.state);
  }

  private reflexCheck(input: string): string | null {
    const dangers = [
      { pattern: /rm\s+-rf\s+\//i, msg: 'rm -rf /' },
      { pattern: /dd\s+if=/i, msg: 'dd if=' },
      { pattern: /mkfs\./i, msg: 'mkfs' },
      { pattern: /fdisk/i, msg: 'fdisk' },
    ];
    for (const d of dangers) {
      if (d.pattern.test(input)) return `🚫 G1 BLOCK: dangerous command prevented (${d.msg})`;
    }
    return null;
  }
}
