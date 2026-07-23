// Brain Engine v2 �?Complete brain architecture + streaming upgrade
// 50ms tick loop: reflex �?prediction �?habit �?cognition (async)
// Reference: predictive-mind §8 main loop, xagent fused kernel

import { MentalState, OutputRouter, BrainComponent, GateResult, WorldSnapshot, TickResult, ReflexHandler, CognitiveDemand } from './types.js';
import { SessionPool } from './session-pool.js';
import { BasalGanglia } from './basal-ganglia.js';
import { MemorySystem } from './memory.js';
import { EmotionEngine } from './emotion.js';
import { RewardSystem } from './reward.js';
import { WorldModel } from './world-model.js';
import { GoalSystem } from './goal.js';
import { LLMClient } from './llm-client.js';
import { Persistence } from './persistence.js';
import { getL1Components, getEvaluationComponents, getSwarmComponents, getRegulationComponents, getComponentsByScenario } from './brain-components.js';
import { PRIMARY_CIRCUIT, REGULATION_CIRCUIT } from './brain-circuits.js';
import { PredictiveLayer } from './predictive-layer.js';
import { BeliefStore } from './belief-store.js';
import { StateEvolution } from './state-evolution.js';
import { ReflexRegistry } from '../../../world-interface/reflex.js';
import { HabitLayer } from './habit-layer.js';
import { BrainLoop } from './brain-loop.js';
import type { WorldInterface } from './brain-loop.js';
import { HormoneSystem } from './brain-hormone.js';
import { DriveSystem } from './brain-drive.js';
import { WaveIntegrator } from './wave-integration.js';
import { SurvivalHabits } from './survival-habits.js';
import { DeathImpact } from './death-impact.js';

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
  readonly waveIntegrator: WaveIntegrator;
  readonly survivalHabits: SurvivalHabits;
  readonly deathImpact: DeathImpact;

  readonly config: BrainEngineConfig;
  private llm: LLMClient;
  private turnCount = 0;
  private cognitivePromise: Promise<void> | null = null;
  private worldInterface: WorldInterface | null = null;
  /** Current long-running action in progress. Set when dispatched, cleared on completion/failure. */
  private ongoingAction: { type: string; startedAt: number; action: string } | null = null;
  /** Active Goal — brain-level commitment. Once set, persist until done, timeout, or emergency. */
  private activeGoal: { action: string; startedAt: number; deadline: number } | null = null;
  /** Previous tick position — for detecting movement and recording position memories. */
  private prevPosition: { x: number; y: number; z: number } | null = null;
  /** Cognitive override — LLM directive that takes priority over habit/prerequisite. One-shot. */
  private cognitiveAction: { action: string; params: Record<string, any> } | null = null;

  state: MentalState;

  constructor(config: BrainEngineConfig) {
    this.config = config;
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
    this.waveIntegrator = new WaveIntegrator();
    this.survivalHabits = new SurvivalHabits();
    this.deathImpact = new DeathImpact();
    this.predictiveLayer.setHormone(this.hormone);
    this.loop = new BrainLoop({ onTick: (s) => this.handleTick(s) });

    this.state = {
      mem: { working: [], episodic: [], semantic: [], procedural: [] },
      wm: WorldModel.default(),
      emo: EmotionEngine.default(),
      goal: GoalSystem.default(),
      rew: RewardSystem.default(),
      lastAction: null,
    };
  }

  /**
   * Set a cognitive override — an action directive from the LLM cognitive layer
   * that takes priority over habit/prerequisite. One-shot: consumed on next tick.
   */
  setCognitiveOverride(action: { action: string; params: Record<string, any> }): void {
    this.cognitiveAction = action;
  }

  /**
   * 流式 tick �?�?50ms 跑一�?   * 反射 �?预测 �?习惯 �?认知(异步)
   */
  async tick(snapshot: WorldSnapshot): Promise<TickResult> {
    const start = Date.now();

    // 0. Wave update (every tick) — feeds snapshot diff into Maslow wave engine
    this.waveIntegrator.update(snapshot);

    // 0b. Death impact extinction (every tick)
    this.deathImpact.tick();

    // 0c. Hormone update (every tick)
    this.hormone.tick(this.state.emo, this.state.rew);

    // 0d. Position memory: record visited positions as episodic memories
    const pos = snapshot.position;
    if (this.prevPosition) {
      const moved = Math.abs(pos.x - this.prevPosition.x) >= 1
        || Math.abs(pos.y - this.prevPosition.y) >= 1
        || Math.abs(pos.z - this.prevPosition.z) >= 1;
      if (moved) {
        this.memory.addEpisodic({
          content: `At position (${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`,
          importance: 0.3,
          tags: ['position', 'visited'],
          position: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
        }, this.hormone);
      }
    }
    this.prevPosition = { x: pos.x, y: pos.y, z: pos.z };

    // 1. Reflex — with hormone-modulated thresholds
    const reflex = this.reflexRegistry.check(snapshot, this.hormone);
    if (reflex) {
      this.stateEvolution.tick(this.state, 50, this.hormone.state);
      return { type: 'reflex', action: reflex, handler: reflex.action, latency: Date.now() - start };
    }

    // 1a. Cognitive override — LLM plan takes priority over habit/prerequisite
    if (this.cognitiveAction) {
      const override = this.cognitiveAction;
      this.cognitiveAction = null;  // one-shot: consumed on use
      this.stateEvolution.tick(this.state, 50, this.hormone.state);
      return {
        type: 'drive' as any,
        action: { action: override.action, params: { ...override.params, reason: 'cognitive_override' } },
        latency: Date.now() - start,
      } as any;
    }

    // 1b. Death impact: contextual fear modulates L2 safety need
    if (this.deathImpact.getDeathCount() > 0) {
      const deathFear = this.deathImpact.getFearAt(snapshot.position);
      if (deathFear > 0.01) {
        // Inject death-contextual fear into L2 wave
        this.waveIntegrator.wave.applyDelta(2, deathFear * 0.08);
      }
    }

    // 1c. SURVIVAL PREREQUISITE: 生存前提
    // 优先级: 食物 > 安全 > 工具材料
    // 只有基本生存满足后, 才执行"没木头→砍树"的前提
    const inventory = (snapshot.inventory || []).map(i => ({ item: i.item, count: i.count }));
    const hasAnyWood = inventory.some(i => i.item.includes('log') && !i.item.includes('_block'));

    // 紧急事件: 跳过前提检查, 让波浪/reflex系统处理
    const isEmergency = snapshot.health < 5 || snapshot.onFire || snapshot.inLava;
    if (isEmergency) {
      this.activeGoal = null;
      this.ongoingAction = null;
    }

    // 饥饿优先: 但如果有 activeGoal (已承诺的目标), 继续执行目标
    const l1 = this.waveIntegrator.getWaveState(1);
    const activeGoalValid = this.activeGoal !== null && Date.now() < this.activeGoal.deadline;
    const starving = l1 >= 0.3 && !activeGoalValid;

    // 紧急或饥饿时跳过前提检查, 让波浪系统处理
    if (!hasAnyWood && !starving && !isEmergency) {
      const l4Frust = this.waveIntegrator.wave.getFrustration(4);
      const stuckHere = l4Frust > 100;

      // explore 冷却中? 让 bot 继续走
      if (this.ongoingAction?.action === 'explore') {
        const elapsed = Date.now() - this.ongoingAction.startedAt;
        if (elapsed < 10000) {
          this.stateEvolution.tick(this.state, 50, this.hormone.state);
          return {
            type: 'drive' as any,
            action: { action: 'explore', params: { reason: 'find_new_area_continue' } },
            latency: Date.now() - start,
          } as any;
        }
        this.ongoingAction = null;
      }

      // 挫败感高了 → explore 换区域
      if (stuckHere && this.ongoingAction?.action !== 'explore') {
        this.ongoingAction = { type: 'drive', startedAt: Date.now(), action: 'explore' };
        this.stateEvolution.tick(this.state, 50, this.hormone.state);
        return {
          type: 'drive' as any,
          action: { action: 'explore', params: { reason: 'find_new_area' } },
          latency: Date.now() - start,
        } as any;
      }

      // 正常: 找树砍
      const woodAction = this.survivalHabits.match('need_wood', inventory);
      if (woodAction) {
        this.ongoingAction = { type: 'drive', startedAt: Date.now(), action: woodAction.action };
        // Set activeGoal: commit to getting wood (30s timeout)
        this.activeGoal = { action: woodAction.action, startedAt: Date.now(), deadline: Date.now() + 30000 };
        this.stateEvolution.tick(this.state, 50, this.hormone.state);
        return {
          type: 'drive' as any,
          action: { action: woodAction.action, params: { ...woodAction.params, reason: 'prerequisite_wood' } },
          latency: Date.now() - start,
        } as any;
      }
    } else {
      // 有木头了 → 清除 activeGoal (完成!)
      this.ongoingAction = null;
      this.activeGoal = null;
      this.waveIntegrator.wave.resetFrustration(4);
    }

    // 1d. Wave-driven motivation — habit first, then wave mapping (every tick)
    // PLAN phase: wave dominant level → survival habit → action
    const dominant = this.waveIntegrator.getDominant();
    let _waveAction = null;
    let _actionParams: Record<string, any> = {};
    if (dominant) {
      const habitAction = this.waveToHabit(dominant.level, inventory);
      if (habitAction) {
        _waveAction = { action: habitAction.action, reason: `habit_L${dominant.level}`, score: dominant.intensity * 5 };
        _actionParams = habitAction.params || {};
      }
    }
    // Fallback: wave direct mapping (no habit matched)
    if (!_waveAction) _waveAction = this.waveIntegrator.selectAction();
    const driveGoal = _waveAction
      ? { action: _waveAction.action, priority: Math.min(5, Math.ceil(_waveAction.score || 1)), reason: _waveAction.reason }
      : null;

    // 2. Predictive coding (0 LLM, <1ms)
    const demand = this.predictiveLayer.tick(snapshot);
    if (demand.level === 'none' || demand.level === 'predictive_pass') {
      this.stateEvolution.tick(this.state, 50, this.hormone.state);
      // Drive goal overrides idle when prediction succeeds
      if (driveGoal && driveGoal.action !== 'idle') {
        return {
          type: 'drive' as any,
          action: { action: driveGoal.action, params: { reason: driveGoal.reason, blockType: driveGoal.blockType, ..._actionParams } },
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
        action: { action: driveGoal.action, params: { reason: driveGoal.reason, blockType: driveGoal.blockType, ..._actionParams } },
        latency: Date.now() - start,
      } as any;
    }

    // 4. Cognitive (LLM, ~2-5s) — fires on surprise OR every ~50 ticks for strategic thinking
    // Receives wave state + habit context for informed decisions
    const cognitiveInterval = (this.turnCount % 50 === 0);  // ~2.5s at 50ms/tick
    if (!this.cognitivePromise && (demand.level === 'cognitive' || cognitiveInterval) && this.turnCount > 0) {
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
    this.worldInterface = world;
    this.loop.start(world);
  }

  /** 停止 */
  stop(): void {
    this.loop.stop();
  }

  /** 是否在运�?*/
  isRunning(): boolean {
    return this.loop.isRunning();
  }

  /** Delegate: select best action from current wave intensities */
  selectWaveAction(): ReturnType<WaveIntegrator['selectAction']> {
    return this.waveIntegrator.selectAction();
  }

  /** Record death for fear conditioning */
  recordDeath(pos: { x: number; y: number; z: number }, cause: string): void {
    this.deathImpact.recordDeath(pos, cause);
  }

  /** Get death-contextual fear at a position (for L2 modulation) */
  getDeathFear(pos: { x: number; y: number; z: number }): number {
    return this.deathImpact.getFearAt(pos);
  }

  /**
   * Wave level → survival habit → action.
   * The PLAN phase: given a dominant wave level (1-5) and current inventory,
   * find the best survival habit that can fire.
   * Returns null if no habit matches (falls through to cognitive/LLM).
   */
  waveToHabit(level: number, inventory: { item: string; count: number }[]): HabitAction | null {
    const triggerMap: Record<number, string[]> = {
      1: ['need_food', 'need_shelter'],
      2: ['need_sleep', 'need_torch', 'need_bed'],
      4: ['need_wood', 'need_planks', 'need_stick', 'need_crafting_table',
          'need_wooden_pickaxe', 'need_stone_pickaxe', 'need_iron_pickaxe',
          'need_iron_sword', 'need_furnace', 'need_chest', 'need_shield', 'need_bed',
          'need_materials'],  // last resort: generic gather
      5: ['need_explore'],
    };
    const triggers = triggerMap[level] || [];
    for (const trigger of triggers) {
      const action = this.survivalHabits.match(trigger, inventory);
      if (action) return action;
    }
    return null;
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
    const result = await this.tick(snapshot);
    // If waiting for ongoing action, skip execution
    if (result.type === 'waiting') return result;

    // Execute reflex and drive actions immediately via world interface
    if (result && result.action && this.worldInterface) {
      try {
        let actResult: { success: boolean; error?: string } | undefined;
        if (result.type === 'reflex') {
          const r = result.action as any;
          actResult = await this.worldInterface.act({ type: r.action || r.type, params: { target: r.target, ...(r.params || {}) } });
        } else if (result.type === 'drive') {
          const a = result.action as any;
          actResult = await this.worldInterface.act({ type: a.action || a.type, params: a.params || {} });
        }
        // Store action result for LLM cognitive layer to see
        if (actResult) {
          const actionName = (result as any).action?.action || result.handler || result.type;
          this.state.lastAction = {
            action: actionName,
            success: actResult.success,
            error: actResult.error,
          };
        }

        // Feedback: action result → update wave + habit + reward
        if (actResult && this.waveIntegrator) {
          // Clear ongoing action on definitive completion only
          // 中间状态 (pathfinding, digging 等) 不清除, 让状态机继续跑
          if (result.type === 'drive' || result.type === 'reflex') {
            const intermediateErrors = ['pathfinding', 'approaching', 'repathfinding', 'digging',
              'dig_aborted_retry', 'found_nearby', 'found_far', 'arrived', 'dug',
              'too_far', 'waiting_collect', 'restart', 'digging_in_progress'];
            const err = actResult?.error || '';
            const isIntermediate = intermediateErrors.some(e => err.includes(e));
            // 只有真正完成(成功且没有中间状态提示)或真正失败才清除
            if (!isIntermediate) {
              this.ongoingAction = null;
            }
          }
          const dominant = this.waveIntegrator.getDominant();
          if (dominant) {
            if (!actResult.success) {
              this.waveIntegrator.wave.markFrustrated(dominant.level);
              this.habitLayer.recordSuccess(`wave_L${dominant.level}`, false);
              this.state.rew = this.reward.update(this.state.rew, { success: false, td_error: -0.2 });
            } else {
              this.waveIntegrator.wave.resetFrustration(dominant.level);
              this.habitLayer.recordSuccess(`wave_L${dominant.level}`, true);
              this.state.rew = this.reward.update(this.state.rew, { success: true, td_error: 0.1 });
            }
          }
        }
      } catch {}
    }
    return result;
  }

  async process(input: string): Promise<{
    output: string; gate: GateResult; signals: any; outputRouter: OutputRouter;
  }> {
    const start = Date.now();
    this.turnCount++;

    // ── 0. Active Memory Retrieval �?hippocampus queries episodic/semantic memory ──
    const episodes = this.memory.retrieveEpisodic(input, 3);
    const semantic = this.lookupSemantic(input);
    const memoryContext = [
      ...episodes.map(e => `[Past: ${e.tags.join('/')}] ${e.content}`),
      ...semantic,
      ...this.state.mem.working.map(w => `[Recent] ${w}`),
    ].join('\n');

    const lastActionStr = this.state.lastAction
      ? `[Last Action] ${this.state.lastAction.action} → ${this.state.lastAction.success ? 'OK' : 'FAIL: ' + (this.state.lastAction.error || 'unknown')}`
      : '';

    // Integrate wave/brain state from the brain's internal systems
    const wave = this.waveIntegrator;
    const dominant = wave?.getDominant();
    const brainStateStr = wave
      ? `L1=${wave.getWaveState(1).toFixed(2)} L2=${wave.getWaveState(2).toFixed(2)} L4=${wave.getWaveState(4).toFixed(2)} L5=${wave.getWaveState(5).toFixed(2)}`
      : 'not_available';
    const brainContext = `## Brain State\n- Waves: ${brainStateStr}\n- Dominant: ${dominant ? `L${dominant.level} (${dominant.intensity.toFixed(2)})` : 'none'}`;

    const enrichedInput = [
      brainContext,
      lastActionStr && `## Last Action Feedback\n${lastActionStr}`,
      memoryContext && `## Relevant Memories\n${memoryContext}`,
      `## Input\n${input}`,
    ].filter(Boolean).join('\n\n');

    // ── 1. Reflex Arc (§5) �?0 LLM ──
    const reflexBlock = this.reflexCheck(input);
    if (reflexBlock) return {
      output: reflexBlock,
      gate: { allowAll: false, allowedTools: [], reason: 'reflex block', signal: 'safety' },
      signals: [], outputRouter: { component: 'reflex', signal: 'safety', usedLLM: false, model: 'none', latency: Date.now() - start },
    };

    // ── 2. Run circuits — stages execute sequentially, components within stage run in parallel ──
    //     Primary circuit: Sensory → Integration → Gate → Action → Synthesis
    //     Each stage receives hormone/drive context; hormones update after each stage
    const allComponents = getComponentsByScenario(this.config.scenario).all;

    // Build hormone context injector + stage-complete callback
    // Injects hormone state, drive state, and wave dominant need
    const contextInjector = () => {
      const dominant = this.waveIntegrator.getDominant();
      return this.hormone.buildHormoneContext(this.drive?.state, dominant ?? undefined);
    };
    const onStageComplete = (acc: Map<string, ComponentOutput>) => {
      this.hormone.updateFromComponents(acc);
      if (this.drive) this.drive.updateFromComponents(acc);
    };

    const cognitiveResults = await this.sessionPool.runCircuit(
      PRIMARY_CIRCUIT, allComponents, enrichedInput, this.state,
      contextInjector, onStageComplete,
    );

    //     Regulation circuit (background): homeostasis, reflection, consolidation
    //     Runs after primary circuit, receives its outputs (no hormone injector needed for background)
    const regResults = await this.sessionPool.runCircuit(
      REGULATION_CIRCUIT, allComponents, enrichedInput, this.state,
      contextInjector, onStageComplete,
    );
    for (const [id, r] of regResults) cognitiveResults.set(id, r);

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
    // Amygdala �?emotion state (§2.5)
    const amy = results.get('amygdala');
    if (amy?.state?.emo) Object.assign(this.state.emo, amy.state.emo);

    // Apply hormone-modulated emotion decay
    this.state.emo = this.emotion.update(this.state.emo, '', this.hormone.state);

    // Hippocampus �?working memory (§2.2)
    this.memory.addToWorking(this.state, input);

    // Safety �?(signals computed by basal ganglia)
    // Reward �?(updated in step 6)
  }

  private async routeOutput(winner: any, input: string, cognitiveResults: Map<string, any>, start: number) {
    const winnerKey = winner?.key || 'none';
    const summaries = Array.from(cognitiveResults.entries())
      .map(([id, r]) => `[${id}] ${(r.summary || '').slice(0, 100)}`).join('\n');

    // Perceive/brain �?synthesizer
    this.llm.setComponentId('synthesizer');
    const result = await this.llm.complete([
      { role: 'system', content: `You are the Brain �?executive integrator (§1.3A).
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
