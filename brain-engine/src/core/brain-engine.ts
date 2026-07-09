// Brain Engine v2 — Complete brain architecture + streaming upgrade
// 50ms tick loop: reflex → prediction → habit → cognition (async)
// Reference: predictive-mind §8 main loop, xagent fused kernel

import { MentalState, OutputRouter, BrainComponent, GateResult, WorldSnapshot, TickResult, ReflexHandler, CognitiveDemand } from './types';
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
import { PredictiveLayer } from './predictive-layer';
import { BeliefStore } from './belief-store';
import { StateEvolution } from './state-evolution';
import { ReflexRegistry } from './reflex-arc';
import { HabitLayer } from './habit-layer';
import { BrainLoop, WorldInterface } from './brain-loop';
import { HormoneSystem } from './brain-hormone';
import { DriveSystem } from './brain-drive';

export interface BrainEngineConfig {
  apiKey: string; baseUrl: string; model: string; persistencePath?: string;
  scenario?: 'coding' | 'minecraft';
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

  // Streaming components
  readonly predictiveLayer: PredictiveLayer;
  readonly beliefStore: BeliefStore;
  readonly stateEvolution: StateEvolution;
  readonly reflexRegistry: ReflexRegistry;
  readonly habitLayer: HabitLayer;
  readonly loop: BrainLoop;
  readonly hormone: HormoneSystem;
  readonly drive: DriveSystem;

  private llm: LLMClient;
  private turnCount = 0;
  private cognitivePromise: Promise<void> | null = null;

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

    // Initialize streaming components
    this.predictiveLayer = new PredictiveLayer();
    this.beliefStore = new BeliefStore();
    this.stateEvolution = new StateEvolution();
    this.reflexRegistry = new ReflexRegistry();
    this.habitLayer = new HabitLayer();
    this.hormone = new HormoneSystem();
    this.drive = new DriveSystem();
    this.predictiveLayer.setHormone(this.hormone);
    this.loop = new BrainLoop({ onTick: (s) => this.handleTick(s) });

    this.state = {
      mem: { working: [], episodic: [], semantic: [], procedural: [] },
      wm: WorldModel.default(),
      emo: EmotionEngine.default(),
      goal: GoalSystem.default(),
      rew: RewardSystem.default(),
    };
  }

  /**
   * 流式 tick — 每 50ms 跑一次
   * 反射 → 预测 → 习惯 → 认知(异步)
   */
  async tick(snapshot: WorldSnapshot): Promise<TickResult> {
    const start = Date.now();

    // 0. Hormone update (every tick)
    this.hormone.tick(this.state.emo, this.state.rew);

    // 1. Reflex — with hormone-modulated thresholds
    const reflex = this.reflexRegistry.check(snapshot, this.hormone);
    if (reflex) {
      this.stateEvolution.tick(this.state, 50, this.hormone.state);
      return { type: 'reflex', action: reflex, handler: reflex.action, latency: Date.now() - start };
    }

    // 1b. Drive System — Maslow motivation (runs every tick, generates goals)
    const driveGoal = this.drive.tick(snapshot);

    // 2. Predictive coding (0 LLM, <1ms)
    const demand = this.predictiveLayer.tick(snapshot);
    if (demand.level === 'none' || demand.level === 'predictive_pass') {
      this.stateEvolution.tick(this.state, 50, this.hormone.state);
      // Drive goal overrides idle when prediction succeeds
      if (driveGoal && driveGoal.action !== 'idle') {
        return {
          type: 'drive' as any,
          action: { action: driveGoal.action, params: { reason: driveGoal.reason } },
          latency: Date.now() - start,
        } as any;
      }
      return { type: 'predictive_pass', latency: Date.now() - start };
    }

    // 3. Habit (0 LLM, ~10ms)
    const habit = this.habitLayer.match(this.serializeSnapshot(snapshot));
    if (habit) {
      this.stateEvolution.tick(this.state, 50);
      return { type: 'habit', action: habit.action, latency: Date.now() - start };
    }

    // 4b. Drive System (fallback when prediction fails but no habit)
    if (driveGoal && driveGoal.action !== 'idle' && demand.level === 'cognitive') {
      this.stateEvolution.tick(this.state, 50);
      return {
        type: 'drive' as any,
        action: { action: driveGoal.action, params: { reason: driveGoal.reason } },
        latency: Date.now() - start,
      } as any;
    }

    // 4. Cognitive (LLM, ~2-5s) — async, don't block tick
    if (!this.cognitivePromise && demand.level === 'cognitive') {
      this.cognitivePromise = this.process(this.serializeSnapshot(snapshot)).then(() => {
        this.cognitivePromise = null;
      });
    }

    this.stateEvolution.tick(this.state, 50, this.hormone.state);
    return {
      type: 'cognitive',
      latency: Date.now() - start,
      output: demand.level === 'cognitive' ? 'cognitive_triggered' : undefined,
    };
  }

  /** 启动 50ms 连续运行 */
  start(world: WorldInterface): void {
    this.loop.start(world);
  }

  /** 停止 */
  stop(): void {
    this.loop.stop();
  }

  /** 是否在运行 */
  isRunning(): boolean {
    return this.loop.isRunning();
  }

  private serializeSnapshot(snapshot: WorldSnapshot): string {
    return JSON.stringify(snapshot);
  }

  /** Look up semantic memory for relevant concepts in the input */
  private lookupSemantic(input: string): string[] {
    const results: string[] = [];
    const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const phrases = [...new Set(words)];
    for (const phrase of phrases) {
      const mem = this.memory.retrieveSemantic(phrase);
      if (mem) {
        results.push(`[Know] ${mem.concept}: ${mem.facts.join(', ')}`);
      }
    }
    return results;
  }

  private async handleTick(snapshot: WorldSnapshot): Promise<TickResult> {
    return this.tick(snapshot);
  }

  async process(input: string): Promise<{
    output: string; gate: GateResult; signals: any; outputRouter: OutputRouter;
  }> {
    const start = Date.now();
    this.turnCount++;

    // ── 0. Active Memory Retrieval — hippocampus queries episodic/semantic memory ──
    const episodes = this.memory.retrieveEpisodic(input, 3);
    const semantic = this.lookupSemantic(input);
    const memoryContext = [
      ...episodes.map(e => `[Past: ${e.tags.join('/')}] ${e.content}`),
      ...semantic,
      ...this.state.mem.working.map(w => `[Recent] ${w}`),
    ].join('\n');

    const enrichedInput = memoryContext
      ? `## Relevant Memories\n${memoryContext}\n\n## Input\n${input}`
      : input;

    // ── 1. Reflex Arc (§5) — 0 LLM ──
    const reflexBlock = this.reflexCheck(input);
    if (reflexBlock) return {
      output: reflexBlock,
      gate: { allowAll: false, allowedTools: [], reason: 'reflex block', signal: 'safety' },
      signals: [], outputRouter: { component: 'reflex', signal: 'safety', usedLLM: false, model: 'none', latency: Date.now() - start },
    };

    // ── 2. ALL 10 Cognitive Components — 并行 (§2.1 + §2.7) ──
    const allComponents = [...getL1Components(), ...getEvaluationComponents()];
    const cognitiveResults = await this.sessionPool.runAll(allComponents, enrichedInput, this.state);

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

    // ── 6b. Hormone update ──
    this.hormone.tick(this.state.emo, this.state.rew);

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

    // Apply hormone-modulated emotion decay
    this.state.emo = this.emotion.update(this.state.emo, '', this.hormone.state);

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
