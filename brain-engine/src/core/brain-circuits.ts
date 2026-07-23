// Brain Circuits — sequential pathway definitions (§2.1-2.7)
// Each circuit is a sequence of stages; components within a stage run in parallel.
// Analogy: L1 (sensory) → L1.5 (integration) → L2 (gating) → L3 (action)

import { BrainCircuit, CircuitStage, ComponentOutput } from './types.js';

// ─── Default input mappers ───

function stage2Mapper(prev: Map<string, ComponentOutput>, raw: string): string {
  const summaries = Array.from(prev.entries())
    .map(([id, o]) => `  [${id}] ${o.summary}`)
    .join('\n');
  return `## Perception Summary\n${summaries}\n\n## Raw Input\n${raw}`;
}

function stage3Mapper(prev: Map<string, ComponentOutput>, _raw: string): string {
  // Collect all signals from Stage 2 components
  const signalLines: string[] = [];
  const summaries: string[] = [];
  for (const [id, o] of prev) {
    summaries.push(`  [${id}] ${o.summary}`);
    for (const [key, val] of Object.entries(o.signals)) {
      signalLines.push(`  ${id}.${key} = ${val}`);
    }
  }
  return `## Stage 2 Outputs\n${summaries.join('\n')}\n\n## Signal Strengths\n${signalLines.join('\n') || '  (none)'}`;
}

function stage4Mapper(prev: Map<string, ComponentOutput>, raw: string): string {
  const gate = prev.get('basal-ganglia');
  const summaries = Array.from(prev.entries())
    .map(([id, o]) => `  [${id}] ${o.summary}`)
    .join('\n');
  return `## Gate Decision\n${gate?.summary || 'unknown'}\n\n## Previous Stage Outputs\n${summaries}\n\n## Raw Input\n${raw}`;
}

function stage5Mapper(prev: Map<string, ComponentOutput>, _raw: string): string {
  return Array.from(prev.entries())
    .map(([id, o]) => `[${id}] ${o.summary}`)
    .join('\n');
}

// ─── Primary Circuit: Perception → Evaluation → Action ───
//
// Stage 1 (Sensory): thalamus, amygdala, hippocampus, world-cortex, safety
//   input: raw (full sensory data)
//   each component extracts only what it needs via extractAfferent
//
// Stage 2 (Integration): insula, cerebellum, attention, reward
//   input: previous (stage 1 summaries)
//   these components analyze the perceived world from their specialty
//
// Stage 3 (Gate): basal-ganglia
//   input: previous (all signal strengths from stage 2)
//   computes Go/NoGo based on competing signals
//
// Stage 4 (Action): dlpfc, motor-cortex, acc, ofc
//   input: combined (gate decision + raw input)
//   plan, execute, monitor, evaluate
//
// Stage 5 (Synthesis): brain
//   input: previous (all stage outputs)
//   produces final response

export const PRIMARY_CIRCUIT: BrainCircuit = {
  id: 'primary',
  name: 'Perception → Evaluation → Action',
  stages: [
    {
      id: 'sensory',
      label: 'Sensory Perception (L1)',
      componentIds: ['thalamus', 'amygdala', 'hippocampus', 'world-cortex', 'safety'],
      inputSource: 'raw',
    },
    {
      id: 'integration',
      label: 'Integration (L1.5)',
      componentIds: ['insula', 'cerebellum', 'attention', 'reward'],
      inputSource: 'previous',
      inputMapper: stage2Mapper,
    },
    {
      id: 'gate',
      label: 'Signal Competition (L2)',
      componentIds: ['basal-ganglia'],
      inputSource: 'previous',
      inputMapper: stage3Mapper,
    },
    {
      id: 'action',
      label: 'Action Selection (L3)',
      componentIds: ['dlpfc', 'motor-cortex', 'anterior-cingulate', 'orbitofrontal'],
      inputSource: 'combined',
      inputMapper: stage4Mapper,
    },
    {
      id: 'synthesis',
      label: 'Synthesis',
      componentIds: ['brain'],
      inputSource: 'previous',
      inputMapper: stage5Mapper,
    },
  ],
};

// ─── Regulation Circuit: Homeostasis & Learning ───
// Runs after primary circuit for background maintenance
//
// Stage R1: hypothalamus, dmn, self-optimizer, offline-consol, self-enhance
//   input: previous (primary circuit outputs)
//   reflection, consolidation, optimization

export const REGULATION_CIRCUIT: BrainCircuit = {
  id: 'regulation',
  name: 'Homeostasis & Learning',
  stages: [
    {
      id: 'regulation',
      label: 'Regulation',
      componentIds: ['hypothalamus', 'dmn', 'self-optimizer', 'offline-consol', 'self-enhance'],
      inputSource: 'previous',
      inputMapper: stage5Mapper,
    },
  ],
};

// ─── All circuits ───

export const ALL_CIRCUITS: BrainCircuit[] = [
  PRIMARY_CIRCUIT,
  REGULATION_CIRCUIT,
];

/** Build a component ID → circuit stage lookup */
export function getCircuitMap(): Map<string, { circuit: BrainCircuit; stage: CircuitStage }> {
  const map = new Map();
  for (const circuit of ALL_CIRCUITS) {
    for (const stage of circuit.stages) {
      for (const id of stage.componentIds) {
        map.set(id, { circuit, stage });
      }
    }
  }
  return map;
}
