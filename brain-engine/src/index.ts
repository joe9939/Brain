// Brain Engine v2 �?barrel export
// arXiv 2504.01990v2: All public API surfaces

export { BrainEngine } from './core/brain-engine.js';
export { BasalGanglia } from './core/basal-ganglia.js';
export { MemorySystem } from './core/memory.js';
export { EmotionEngine } from './core/emotion.js';
export { RewardSystem } from './core/reward.js';
export { GoalSystem } from './core/goal.js';
export { WorldModel } from './core/world-model.js';
export { SessionPool } from './core/session-pool.js';
export { LLMClient } from './core/llm-client.js';
export { Persistence } from './core/persistence.js';
export { getAllComponents } from './core/brain-components.js';
export { PredictiveLayer, PhysicsPredictor } from './core/predictive-layer.js';
export { BeliefStore } from './core/belief-store.js';
export { StateEvolution } from './core/state-evolution.js';
export { ReflexRegistry } from '../../world-interface/reflex.js';
export type { ReflexHandler, ReflexAction } from '../../world-interface/reflex.js';
export { HabitLayer } from './core/habit-layer.js';
export { BrainLoop } from './core/brain-loop.js';
export { DriveSystem } from './core/brain-drive.js';

export type {
  MentalState,
  MemoryState,
  EpisodicMemory,
  SemanticMemory,
  SOP,
  WorldModelState,
  EmotionState,
  GoalState,
  Goal,
  RewardState,
  SignalResult,
  GateResult,
  BrainComponent,
  ComponentOutput,
  OutputRouter,
  ToolCategory,
  WorldSnapshot,
  Action,
  SurpriseSignal,
  CognitiveDemand,
  TickResult,
  ReflexAction,
  ReflexHandler,
  PredictedState,
  PredictionEngine,
  Habit,
  Belief,
  HomeostasisState,
} from './core/types.js';
