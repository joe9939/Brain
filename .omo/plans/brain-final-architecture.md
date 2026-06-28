# Brain Agent — Final Architecture

## Architecture: Parallel Modules + Hook Events

Derived from Foundation Agents paper (arXiv 2504.01990) catalogue analysis.

## Core Principle
7 modules (Cognition, Memory, Perception, World Model, Action, Reward, Emotion) run in PARALLEL.
Each has its own input sources, processing lifecycle, and output targets.
No linear pipeline. Communication through shared working memory.

## Module Structure

| Module | Sub-modules | Activation | Storage |
|--------|------------|-----------|--------|
| Perception | Text, Image, Audio, Multimodal | External input | Working memory |
| Cognition | Learning, Reasoning, Planning | Working memory change | Long-term memory |
| Memory | Sensory, Short-term, Long-term, Lifecycle | Retrieval cue | 8 MCP servers |
| World Model | Environment, Prediction, Simulation | Action planning | Codebase index |
| Action | Tool use, Swarm, Hierarchical | Decision from PFC | Execution log |
| Reward | Extrinsic, Intrinsic, Shaping | Action completion | Reward history |
| Emotion | Detection, Regulation, Propagation | Perception + Memory | Mood state |

## Hook Implementation

### T3: chat.message — Perception trigger
- Fires on every user message
- Activates all perception sub-modules in parallel
- Each sub-agent reads input independently

### T2: tool.execute.after — Module completion detector
- Detects when any sub-agent completes
- Updates working memory with results
- Conditionally triggers dependent modules

### T1: tool.execute.before — Safety + Resource guard
- Safety check (dangerous commands)
- Budget check (resource limits)
- Causal analysis reminder

### T4: event — Lifecycle + Maintenance
- Memory consolidation (idle 30min+)
- DMN idle reflection (2min+)
- Periodic self-enhancement (task count)

## Shared State
- Layer 1: In-memory session state (mood, cycle, gates, tasks)
- Layer 2: MCP servers (persistent storage)
- Layer 3: Agent prompt context (injected by hooks)

## Testing Strategy
1. Unit test each hook in isolation (mock inputs, assert outputs)
2. Integration test module chains (perception→memory→action)
3. E2E test via brain-circuit.log (real OpenCode session)
4. Agentest for LLM behavioral verification

## Papers Read (4)
- ReAct (2210.03629): reasoning+action interleaving
- Reflexion (2303.11366): verbal feedback instead of weight updates
- Generative Agents (2304.03442): observation → reflection → planning cycle
- Tree of Thoughts (2305.10601): multiple reasoning paths + self-evaluation + backtracking

## Key Architecture Impacts
1. ReAct → Perception+Action should interleave, not separate
2. Reflexion → Learning loop stores verbal feedback, not weights
3. Gen Agents → Memory stream + periodic reflection synthesis
4. ToT → L2 gate should evaluate multiple paths, backtrack when needed
