// Core types for Brain Agent v2 — based on arXiv 2504.01990v2
// §1.3A: The Agent Loop — Perception–Cognition–Action

/**
 * Mental State M_t = {M^mem, M^wm, M^emo, M^goal, M^rew, ...}
 * §1.3A Definition: Agent's internal state at time t
 */
export interface MentalState {
  mem: MemoryState;      // M^mem — memory component
  wm: WorldModelState;   // M^wm — world model component
  emo: EmotionState;     // M^emo — emotion component
  goal: GoalState;       // M^goal — goal component
  rew: RewardState;      // M^rew — reward/learning component
  lastAction: { action: string; success: boolean; error?: string } | null;  // Last action execution result
}

export interface MemoryState {
  working: string[];         // Short-term / working memory
  episodic: EpisodicMemory[]; // Long-term episodic
  semantic: SemanticMemory[]; // Long-term semantic
  procedural: SOP[];          // Procedural (skills, SOPs)
}

export interface EpisodicMemory {
  id: string;
  timestamp: number;
  content: string;
  importance: number;   // 0-1, affects consolidation priority
  tags: string[];
  position?: { x: number; y: number; z: number };  // where this memory was formed
}

export interface SemanticMemory {
  id: string;
  concept: string;
  facts: string[];
  confidence: number;
}

export interface SOP {
  id: string;
  trigger: RegExp | string;
  steps: string[];
  context: string;
  frequency: number;
}

export interface WorldModelState {
  lastScan: number;
  changedFiles: string[];
  codebaseDigest: string;
  predictions: Map<string, number>; // predicted outcomes
}

export interface EmotionState {
  mode: 'NORMAL' | 'CAUTION' | 'URGENT' | 'EXPLORE' | 'SUPPORT';
  intensity: number;   // 0-1
  valence: number;     // -1 to 1
  arousal: number;     // 0-1
  dominance: number;   // 0-1
}

export interface GoalState {
  active: Goal[];
  completed: number;
  history: Goal[];
}

export interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  priority: number;
  created: number;
  completedAt?: number;
}

export interface RewardState {
  score: number;
  total: number;
  td_error: number;
  history: number[];
}

/**
 * Signal competition — §2.4: 7 signals compete for action selection
 * Winner = raw × priority. Deduplicated.
 */
export interface SignalResult {
  key: string;
  label: string;
  raw: number;
  priority: number;
  strength: number;  // raw × priority
}

/**
 * Basal Ganglia gate result — §3.3.4
 * The winning signal determines which tools/actions are allowed
 */
export interface GateResult {
  allowAll: boolean;
  allowedTools?: string[];
  reason: string;
  signal: string | null;
}

/**
 * Component interface — each brain region is a Component
 * with its own LLM session, prompt, and state
 */
export interface BrainComponent {
  id: string;
  label: string;
  sessionId: string;
  model?: string;
  prompt: string;
  run?(input: string, state: MentalState): Promise<ComponentOutput>;
  /**
   * Sensory afferent — extracts component-specific input from raw data.
   * Analogous to hard-wired sensory pathways in the brain:
   * - Visual cortex only gets visual data (terrain/blocks)
   * - Amygdala only gets threat-relevant data (entities/health)
   * - Insula only gets interoceptive data (health/hunger/oxygen)
   * If omitted, the component receives the full raw input (default).
   */
  extractAfferent?(rawInput: string, state: MentalState): string;
}

export interface ComponentOutput {
  componentId: string;
  summary: string;
  signals: Record<string, number>;   // signal key → raw strength
  state: Partial<MentalState>;
  metadata?: Record<string, any>;
  /**
   * Maslow need levels output by this component.
   * Analogous to: amygdala → L2(safety), hypothalamus → L1(physiological)
   * Key = Maslow level (1-5), Value = urgency (0-1)
   */
  needs?: Partial<Record<1|2|3|4|5, number>>;
}

/**
 * DriveState — unified motivational state from all component outputs.
 * Emerges from component needs + hormone modulation, NOT computed centrally.
 * Each drive is 0-1, representing intensity of that motivational signal.
 */
export interface DriveState {
  hunger: number;     // L1: need food
  fear: number;       // L2: threat detected
  fatigue: number;    // L1: exhausted
  curiosity: number;  // L5: exploration/learning
  social: number;     // L3: social belonging
  mastery: number;    // L4: achievement/competence
}

/**
 * Circuit Stage — sequential processing stage in a brain circuit.
 * Components within a stage run in parallel; stages run sequentially.
 * Analogous to: L1 (perception) → L1.5 (integration) → L2 (gating) → L3 (action)
 */
export interface CircuitStage {
  id: string;
  label: string;
  /** Component IDs in this stage */
  componentIds: string[];
  /**
   * How this stage receives input:
   * - 'raw': the original input (for sensory reception)
   * - 'previous': outputs from the previous stage only
   * - 'combined': raw input + previous stage summaries
   */
  inputSource: 'raw' | 'previous' | 'combined';
  /**
   * Optional mapper: transforms previous stage outputs into context for this stage.
   * Analogy: thalamus → amygdala fast path, cortex → hippocampus memory encoding
   */
  inputMapper?: (previousOutputs: Map<string, ComponentOutput>, rawInput: string) => string;
}

/**
 * A complete brain circuit — sequential stages with defined connectivity
 */
export interface BrainCircuit {
  id: string;
  name: string;
  stages: CircuitStage[];
}

/**
 * Tool categories for gate control
 */
export type ToolCategory = 'task' | 'read' | 'write' | 'exec' | 'web' | 'admin';

/**
 * Output Router — 信号决定谁负责输出 (§2.7)
 * 人脑没有"一个输出区", 谁赢了信号谁负责输出
 */
export interface OutputRouter {
  component: string;        // 哪个组件负责输出
  signal: string | null;    // 获胜信号
  usedLLM: boolean;         // 是否调用了 LLM
  model: string;            // 使用的模型
  latency: number;          // ms
}

export const TOOL_MAP: Record<string, ToolCategory> = {
  task: 'task',
  read: 'read', grep: 'read', glob: 'read', look_at: 'read',
  lsp_diagnostics: 'read', lsp_symbols: 'read',
  codegraph_explore: 'read', codegraph_node: 'read',
  session_info: 'read', session_list: 'read',
  background_output: 'read',
  write: 'write', edit: 'write',
  bash: 'exec',
  webfetch: 'web', websearch: 'web',
  websearch_web_search_exa: 'web',
};

// ═══════════════════════════════════════════════════════
// Streaming Architecture Types
// ═══════════════════════════════════════════════════════

// WorldSnapshot, Action, BotEvent 定义已移到 world-interface/types
import { WorldSnapshot, Action, BotEvent } from '../../../world-interface/types.js';
export type { WorldSnapshot, Action, BotEvent };

/** Multi-dimensional prediction error signal */
export interface SurpriseSignal {
  total: number;
  dimensions: { position: number; health: number; threat: number; inventory: number };
  attention: number;
}

/** Processing level needed — the core streaming decision */
export type CognitiveDemand =
  | { level: 'none' }
  | { level: 'reflex'; action: ReflexAction; handler: string }
  | { level: 'predictive_pass' }
  | { level: 'habit'; habit: Habit }
  | { level: 'cognitive'; surprise: SurpriseSignal; attention: number };

/** Result of one engine tick */
export interface TickResult {
  type: 'reflex' | 'predictive_pass' | 'habit' | 'drive' | 'cognitive' | 'waiting';
  latency: number;
  action?: any;
  output?: string;
  handler?: string;
}

/** What a reflex handler decided to do */
export interface ReflexAction {
  priority: number;
  action: string;
  target?: string;
  params?: Record<string, any>;
}

/** Pluggable reflex handler interface */
export interface ReflexHandler {
  name: string;
  priority: number;
  check(snapshot: WorldSnapshot, hormone?: { modulateReflexThreshold(base: number): number }): ReflexAction | null;
}

/** What the predictor predicted */
export interface PredictedState {
  position: { x: number; y: number; z: number };
  health: number;
  threats: { id: string; distance: number }[];
  confidence: number;
}

/** Prediction engine interface — swap Physics for Latent later */
export interface PredictionEngine {
  predict(prev: WorldSnapshot, action?: Action): PredictedState;
  confidence(): number;
}

/** A learned habit (SOP-like, but learned online) */
export interface Habit {
  id: string;
  trigger: string;
  action: Action;
  frequency: number;
  lastUsed: number;
  successRate: number;
}

/** A stored belief (prediction + outcome) */
export interface Belief {
  id: string;
  timestamp: number;
  context: string;
  prediction: any;
  outcome: any;
  surprise: number;
  confidence: number;
  tags: string[];
}

/** Internal homeostasis state for idle evolution */
export interface HomeostasisState {
  hunger: number;      // 0-100, higher = more hungry
  energy: number;      // 0-100, higher = more rested
  boredom: number;     // 0-100, higher = more bored
  lastInputTime: number;
}

/** Hormone system — global modulator for all subsystems */
export interface HormoneState {
  adrenaline: number;   // 0-1, fight/flight — spikes on URGENT, fast decay
  cortisol: number;     // 0-1, chronic stress — builds on CAUTION, slow decay
  endorphin: number;    // 0-1, pleasure — reward success, medium decay
  dopamine: number;     // 0-1, motivation — goal progress, baseline 0.5
  serotonin: number;    // 0-1, wellbeing — baseline 0.5, slow changes
  oxytocin: number;     // 0-1, bonding — social/support, slow decay
}
