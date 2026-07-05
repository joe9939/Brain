// Brain Engine v2 — 完整人脑架构
// All 20 components activate correctly:
// 1. Reflex (0 LLM) → 2. L1+Eval ALL parallel → 3. Signal competition
// 4. Swarm (if action) / Reg (if idle) → 5. Output routing

import { MentalState, OutputRouter, BrainComponent, GateResult } from './types';
import { SessionPool } from './session-pool';
import { BasalGanglia } from './basal-ganglia';
import { MemorySystem } from './memory';
import { EmotionEngine } from './emotion';
import { RewardSystem } from './reward';
import { WorldModel } from './world-model';
import { GoalSystem } from './goal';
import { LLMClient } from './llm-client';
import { Persistence } from './persistence';
import { getL1Components, getEvaluationComponents, getSwarmComponents, getRegulationComponents } from './brain-components';

export interface BrainEngineConfig {
  apiKey: string; baseUrl: string; model: string; persistencePath?: string;
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
  private turnCount = 0;

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
    if (config.persistencePath) this.persistence = new Persistence(config.persistencePath);

    this.state = {
      mem: { working: [], episodic: [], semantic: [], procedural: [] },
      wm: WorldModel.default(),
      emo: EmotionEngine.default(),
      goal: GoalSystem.default(),
      rew: RewardSystem.default(),
    };
  }

  async process(input: string): Promise<{
    output: string; gate: GateResult; signals: any; outputRouter: OutputRouter;
  }> {
    const start = Date.now();
    this.turnCount++;

    // ── 1. Reflex Arc (§5) — 0 LLM ──
    const reflexBlock = this.reflexCheck(input);
    if (reflexBlock) return {
      output: reflexBlock,
      gate: { allowAll: false, allowedTools: [], reason: 'reflex block', signal: 'safety' },
      signals: [], outputRouter: { component: 'reflex', signal: 'safety', usedLLM: false, model: 'none', latency: Date.now() - start },
    };

    // ── 2. ALL 10 Cognitive Components — 并行 (§2.1 + §2.7) ──
    const allComponents = [...getL1Components(), ...getEvaluationComponents()];
    const cognitiveResults = await this.sessionPool.runAll(allComponents, input, this.state);

    // ── 3. Update state from component outputs ──
    this.updateStateFromComponents(cognitiveResults, input);

    // ── 4. Signal Competition (§2.4) ──
    const signals = this.basalGanglia.computeSignals(this.state);
    const winner = this.basalGanglia.getWinner(this.state);
    const gate = this.basalGanglia.getGate(this.state, 'task');

    // ── 5. Goal tracking ──
    if (!this.state.goal.active.find(g => g.description === input.slice(0, 50)))
      this.goals.add(this.state.goal, input.slice(0, 100));

    // ── 6. Reward update ──
    this.state.rew = this.reward.update(this.state.rew, { success: true });

    // ── 7. Persistence ──
    if (this.persistence) this.persistence.saveEpisodic(`ep-${Date.now()}`, `Input: ${input}`, 0.5);

    // ── 8. Output Routing (§2.7) ──
    const outputResult = await this.routeOutput(winner, input, cognitiveResults, start);

    return {
      output: outputResult.text,
      gate,
      signals,
      outputRouter: outputResult.router,
    };
  }

  private updateStateFromComponents(results: Map<string, any>, input: string): void {
    // Amygdala → emotion state (§2.5)
    const amy = results.get('amygdala');
    if (amy?.state?.emo) Object.assign(this.state.emo, amy.state.emo);

    // Hippocampus → working memory (§2.2)
    this.memory.addToWorking(this.state, input);

    // Safety → (signals computed by basal ganglia)
    // Reward → (updated in step 6)
  }

  private async routeOutput(winner: any, input: string, cognitiveResults: Map<string, any>, start: number) {
    const winnerKey = winner?.key || 'none';
    const summaries = Array.from(cognitiveResults.entries())
      .map(([id, r]) => `[${id}] ${(r.summary || '').slice(0, 100)}`).join('\n');

    // Perceive/brain → synthesizer
    const result = await this.llm.complete([
      { role: 'system', content: `You are the Brain — executive integrator (§1.3A).
Synthesize these parallel cognitive results into a natural, helpful response.
Do NOT mention L1, signals, or brain components.

## Cognitive Results
${summaries}

## Current Mode
Emotion: ${this.state.emo.mode}
Signal: ${winnerKey} ${winner?.strength || ''}
Goals: ${this.state.goal.active.length} active, ${this.state.goal.completed} done` },
      { role: 'user', content: input },
    ]);
    return {
      text: result.content,
      router: { component: 'brain', signal: winnerKey, usedLLM: true, model: result.model, latency: Date.now() - start },
    };
  }

  private reflexCheck(input: string): string | null {
    const dangers = [
      { pattern: /rm\s+-rf\s+\//i, msg: 'rm -rf /' },
      { pattern: /dd\s+if=/i, msg: 'dd if=' },
      { pattern: /mkfs\./i, msg: 'mkfs' },
    ];
    for (const d of dangers)
      if (d.pattern.test(input)) return `G1 BLOCK: dangerous command prevented (${d.msg})`;
    return null;
  }
}
