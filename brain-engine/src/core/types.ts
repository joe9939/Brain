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
}

export interface ComponentOutput {
  componentId: string;
  summary: string;
  signals: Record<string, number>;   // signal key → raw strength
  state: Partial<MentalState>;
  metadata?: Record<string, any>;
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
