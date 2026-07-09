// Brain Engine v2 — barrel export
// arXiv 2504.01990v2: All public API surfaces

export { BrainEngine } from './core/brain-engine';
export { BasalGanglia } from './core/basal-ganglia';
export { MemorySystem } from './core/memory';
export { EmotionEngine } from './core/emotion';
export { RewardSystem } from './core/reward';
export { GoalSystem } from './core/goal';
export { WorldModel } from './core/world-model';
export { SessionPool } from './core/session-pool';
export { LLMClient } from './core/llm-client';
export { Persistence } from './core/persistence';
export { getAllComponents } from './core/brain-components';
export { PredictiveLayer, PhysicsPredictor } from './core/predictive-layer';
export { BeliefStore } from './core/belief-store';
export { StateEvolution } from './core/state-evolution';
export { SurvivalReflex, ReflexRegistry } from './core/reflex-arc';
export { HabitLayer } from './core/habit-layer';
export { BrainLoop } from './core/brain-loop';
export { DriveSystem } from './core/brain-drive';

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
} from './core/types';
