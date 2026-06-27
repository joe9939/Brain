# Brain Agent — Foundation Agent for OpenCode

Brain-inspired multi-agent system implementing [arXiv 2504.01990](https://arxiv.org/abs/2504.01990) (Foundation Agents).
24 brain-region agents, 4 enhanced MCP servers, 1 safety plugin (G1-G7), 32/32 tests passing.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b.svg)](https://arxiv.org/abs/2504.01990)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)
[![Oh-My-OpenAgent](https://img.shields.io/badge/OMO-integrated-blue)](https://github.com/code-yeongyu/oh-my-opencode)
[![Tests](https://img.shields.io/badge/Tests-32%2F32-brightgreen)]()
[![Circuits](https://img.shields.io/badge/Circuits-11%20wired-blue)]()

</div>

---

## Quick Start

```bash
# Install brain-agent (plugin, agents, MCP, config)
node install.js

# Verify everything is set up
node install.js --status

# Run all static tests (32 tests, ~500ms)
node tests/runner.js --all

# Run E2E behavioral test scenarios
node tests/brain-e2e-runner.js

# Dry-run to check source files without installing
node install.js --dry-run
```

Restart OpenCode. Press Tab → select **[brain]**. That's it.

> Requires [Node.js](https://nodejs.org) 18+, [OpenCode](https://opencode.ai), and [Oh My OpenAgent](https://github.com/code-yeongyu/oh-my-opencode).
> Brain Agent is built ON TOP of Oh My OpenAgent — OMO categories and task() delegation are the architecture foundation.

---

## What is Brain Agent?

Brain Agent implements the Foundation Agent framework as a complete **perceive → orient → decide → act → record** pipeline. Each message triggers a coordinated sequence of sub-agents, MCP tools, and circuit mechanisms.

```
Message → [L1: 5-way perception] → [L1.5: mood/reward modulation] → [L2: gate selection] → [L3: action] → [POST: record + learn]
```

**Key capabilities:**
- **5-way parallel perception**: thalamus + amygdala + hippocampus + world-cortex + safety, every message
- **Dynamic L2 gate thresholds**: adaptive via brain-gate-tuner, not hardcoded
- **Emotional contagion**: swarm agents' moods influence the orchestrator's emotional state
- **Consensus decision making**: high-risk decisions use 3-agent voting (reward/basal/insula)
- **Episodic + semantic + procedural memory**: SQLite-backed MCP with vector search
- **Memory lifecycle**: decay, consolidation, conflict detection, importance-weighted retention
- **Predictive world model**: BFS dependency impact analysis with precision/recall tracking
- **Agent reputation system**: reliability tracking per agent, weighted into gate competition
- **Causal analysis**: transitive dependency tracing for change impact assessment
- **Versioned shared state**: GLOBAL_STATE changelog with monotonic version counter
- **Meta-learning**: task pattern analysis every 5 completions
- **Adversarial testing**: red-team agent generates injection/obfuscation/social tests
- **Architecture self-optimization**: agent topology analysis every 50 tasks
- **Intrinsic motivation**: curiosity-driven exploration during idle cycles
- **Value learning**: captures user feedback to adjust reward model

---

## Architecture

### 5-Phase OODA Pipeline

```
PHASE    FUNCTION                    AGENTS FIRED
───────  ──────────────────────────  ───────────────────────────────
L1       Perceive (parallel)         thalamus, amygdala, hippocampus,
                                      world-cortex, safety
L1.5     Orient (modulate)           mood decay, reward bias,
                                      emotional contagion
L2       Decide (gate competition)   WTA scoring → top-2 parallel:
                                      reward, attention, basal,
                                      cerebellum, safety, insula
                                      [consensus gate for high-risk]
L3       Act (swarm or direct)       swarm-planner → coder →
                                      reviewer → tester (recursive DAG)
POST     Record + learn              reflexion, memory_store,
                                      world_update, gate tuning,
                                      curiosity, meta-learner
```

### Layer Detail

```
Layer 1 — Always-on (every message, 5 parallel)
  thalamus      → gate input, detect intents, urgency scoring
  amygdala      → emotion detection (URGENT/EXPLORE/SUPPORT/CAUTION/NORMAL)
  hippocampus   → memory retrieval (hybrid keyword + vector search)
  world-cortex  → codebase structure and impact analysis
  safety        → background security scan

Layer 1.5 — Modulation (after L1 collected)
  mood_decay    → smooth intensity between cycles, propagate to all layers
  reward_bias   → attention_priority_bias formula (clamped)
  contagion     → swarm agent moods vote into orchestrator mood
  homeostasis   → corrective actions on system anomaly

Layer 2 — Conditional Gate Competition (event-driven)
  Gate scoring: urgency×0.35 + reward_bias×0.25 + safety×0.25 + reliability×0.15
  Top-2 gates fire in parallel (bounded by attention budget)
  Consensus gate: when safety=strict AND uncertainty>threshold, 3-agent vote
  
  | Condition | Agent |
  |-----------|-------|
  | gate=BLOCK / CAUTION / danger pattern | brain-safety |
  | score_action < GLOBAL_STATE.gate_thresholds.reward | brain-reward |
  | todowrite > GLOBAL_STATE.gate_thresholds.attention | brain-attention |
  | SOP matched | brain-basal |
  | tool ambiguous | brain-cerebellum |
  | system alert | brain-insula |

Layer 3 — Action (complex task)
  swarm-planner  → decompose into recursive DAG (max depth 3)
  causal_analyze → transitive dependency tracing before coding
  world_predict  → BFS impact prediction, verified after action
  swarm-coder    → implement DAG nodes (parallel waves)
  swarm-reviewer → validate (fix loop, max 2)
  swarm-tester   → verify

POST — Record
  reflexion       → self-enhance, store lessons
  memory_store    → episodic/semantic/procedural
  score_agent     → update reputation tracking
  world_update    → compare prediction vs actual (precision/recall)
  gate_tuner      → adjust L2 thresholds from decision history
  memory_decay    → reduce importance of stale memories
  memory_consolidate → merge related low-importance memories
  memory_detect_conflicts → scan for contradictions, auto-resolve
  value_learn     → capture user feedback
```

### Sub-Agent Skill Files

| Skill | Trigger | Function |
|-------|---------|----------|
| brain-gate-tuner | POST ≥3 decisions | Adjust L2 reward/attention/confidence/urgency thresholds |
| brain-curiosity | Idle, every 5 tasks | Detect underexplored code, knowledge gaps, patterns |
| brain-meta-learner | Every 5 tasks | Analyze task patterns, recommend approach optimizations |
| brain-red-team | Every 20 tasks | Generate adversarial test cases (injection/obfuscation/social/edge) |
| brain-architect | Every 50 tasks | Agent topology analysis, merge/remove/retune recommendations |

---

## Circuit Mechanisms (11 implemented)

| Circuit | Principle | Implementation |
|---------|-----------|---------------|
| **OODA Loop** | Observe→Orient→Decide→Act→Record, closes next cycle | L1→L1.5→L2→L3→POST→next L1 |
| **Shared Global State** | Cross-circuit shared data with conflict resolution | GLOBAL_STATE (mood, reward, safety, personality, attention_budget, gate_thresholds) |
| **Versioned State** | Monotonic version counter + changelog per write | GLOBAL_STATE._version, _changelog at 6 write points |
| **Winner-Take-Most** | Gate scoring + top-2 parallel execution | gate_score = urgency×0.35 + reward×0.25 + safety×0.25 + reliability×0.15 |
| **Mood→All Layers** | Amygdala → L1.5 decay → L2 thresholds → L3 context → POST | 6-layer propagation path |
| **Emotional Contagion** | Swarm moods vote into orchestrator mood | L1.5 Step 3b: majority_vote(swarm_moods) |
| **Personality→L3/Post** | OCEAN traits → swarm context → trait drift | 5-factor model, drift via POST reflexion |
| **Reward→Attention** | reward.score → attention_priority_bias → budget cap | Modulation within GLOBAL_STATE.attention_budget |
| **Attention Budget** | 0-1 budget allocation, consumption per gate, renewal per cycle | Budget enforcement before L2 firing |
| **Safety Continuous** | L1→L1.5→L2→L3→POST, safety_level propagates all layers | 6 safety checkpoints per cycle |
| **World Predict→Verify** | BFS prediction before L3, precision/recall after action | world_predict + world_diff with trend tracking |
| **Homeostasis** | Insula fires → corrective actions (non-destructive) | Reduce load, raise safety, log |
| **Learning Loop** | POST reflexion → memory_store → L1 next cycle | recent_lessons injected into L1_CONTEXT |
| **Collective Consensus** | High-risk: 3 agents vote (2/3 majority) | reward + basal + insula parallel voting |
| **Causal Analysis** | BFS dependency tracing, transitive impact categories | world_causal_analyze (direct/indirect/cascade) |
| **Memory Decay** | Importance reduction, archival at threshold | memory_decay tool, consolidation |
| **Memory Conflict** | Tag-based grouping, similarity comparison, auto-resolve | memory_detect_conflicts + memory_resolve |
| **Reputation** | Agent reliability scoring, WTA weight factor | score_agent, agent_reputation (tool-tracker) |

### Conflict Resolution Rules

Three cross-circuit rules governing competing signals:

1. **(D-K) attention_budget is outer cap** — reward modulation within remaining budget
2. **(B-J) safety=CAUTION freezes trait drift, pauses DMN loop**
3. **(H-I) threshold = personality_base + mood_offset, clamped [0.0, 1.0]**

---

## MCP Server Tools

| MCP | Tools | Purpose |
|-----|-------|---------|
| **memory-store** | memory_store, memory_retrieve, memory_summarize, memory_link, memory_forget, memory_search_semantic, memory_embed, memory_decay, memory_consolidate, memory_detect_conflicts, memory_resolve, memory_replay, mood_set, mood_get | Episodic/semantic/procedural memory with lifecycle |
| **world-model** | world_query, world_update, world_predict, world_diff, world_causal_analyze | Codebase dependency graph, impact prediction |
| **reward-system** | score_hierarchy, record_hierarchical, td_update, value_learn | Hybrid reward scoring with user feedback learning |
| **tool-tracker** | track_tool_use, get_tool_stats, recommend_tool, score_agent, agent_reputation | Usage patterns, agent reliability tracking |
| **sop-tracker** | sop_add, sop_match, sop_list, sop_enable, sop_disable | Procedure memory and matching |
| **reflexion** | reflexion_start, reflexion_add_observation, reflexion_generate_lessons, reflexion_suggest_skill | Self-refinement loop |
| **priority-queue** | queue_add, queue_next, queue_blocked_by, queue_complete, queue_prioritize, queue_stats | Task scheduling |
| **monitor** | monitor_get_health, monitor_get_alerts, monitor_report_event | Health dashboard |
| **brain-plugin** | tool.execute.before hook (G1-G7) | Safety gates |

---

## Agent Inventory

| Agent | Trigger | Function |
|-------|---------|----------|
| thalamus | every message | Gate input, extract priority |
| amygdala | every message | Detect emotion mode (URGENT/EXPLORE/SUPPORT/CAUTION/NORMAL) |
| hippocampus | every message | Retrieve episodic/semantic/procedural memories |
| world-cortex | every message | Codebase structure and impact analysis |
| safety | every message | Background security scan |
| attention-cortex | todowrite > gate_thresholds.attention | Prioritize pending tasks |
| reward-cortex | score_action < gate_thresholds.reward | Risk assessment |
| safety-cortex | danger pattern | Security audit |
| basal-ganglia | SOP matched | Go/NoGo decision |
| cerebellum | tool ambiguous | Tool recommendation |
| premotor-cortex | trajectory complete | Skill extraction |
| dlpfc | working memory overflow | Memory gating |
| self-enhance | after task | Post-task reflection |
| gate-tuner | POST ≥3 decisions | Dynamic L2 threshold adjustment |
| curiosity | idle, every 5 tasks | Intrinsic exploration |
| meta-learner | every 5 tasks | Pattern analysis |
| red-team | every 20 tasks | Adversarial testing |
| architect | every 50 tasks | Topology optimization |
| insula | system error | Anomaly detection |
| hypothalamus | scheduled | Timer triggers |
| dmn | idle >2min | Mind-wandering |
| self-optimizer | every 3 tasks | Prompt evolution |
| offline-consolidation | idle 6h | Memory consolidation |
| swarm-planner | complex task | DAG decomposition (recursive, max depth 3) |
| swarm-coder | need code | Implementation |
| swarm-reviewer | coder done | Validation |
| swarm-tester | review pass | Verification |

---

## Test Suite

### Static Tests (32/32 PASS)

```bash
node tests/runner.js --all
```

| Category | Tests | What |
|----------|-------|------|
| UNIT | 3 | G1-G7 gate patterns, install logic, prompt format |
| INTEGRATION | 3 | Circuit coexistence, L1 perceive, L2 conditional gates |
| E2E | 8 | Chat trigger, routing, dark mode, install cycle, activation, runtime, conformance |
| CIRCUITS | 14 | All 11 circuits + 3 pathway tests |
| QC | 4 | OMO structure, architecture, circuit consistency, regression |

### Circuit Evidence Files

```bash
node tests/runner.js --circuits
```

Each test writes evidence to `.omo/evidence/<circuit-name>.md` with structured PASS/FAIL + check list.

### E2E Behavioral Tests

```bash
node tests/brain-e2e-runner.js       # Run all scenarios
node tests/brain-e2e-runner.js --list # List available scenarios
```

Validates circuit firing, L1-5-way, mood detection, safety, WTA scoring, etc.

---

## Gap Closure Status

All 18 identified gaps from the Foundation Agents paper are addressed:

| Phase | Gaps | Status |
|-------|------|--------|
| **Phase 0** — Quick Wins | L2 dynamic thresholds, curiosity, multi-modal perception | ✅ |
| **Phase 1** — Core Infrastructure | Memory decay, vector search, reputation, predictive world model | ✅ |
| **Phase 2** — Advanced Cognition | Meta-learning, causal reasoning, hierarchy, emotional contagion, consensus | ✅ |
| **Phase 3** — Frontier | Red-team, value learning, architecture optimization, versioned state, conflict resolution | ✅ |

Paper alignment: **43/43 sections** covered (see `docs/paper-5-gaps.md` for detail).

---

## Project Structure

```
brain-agent/
├── .opencode/skills/brain-master.md     Main orchestrator prompt (18 circuits, 680+ lines)
├── src/
│   ├── skills/                          5 sub-agent skill files
│   ├── mcp/
│   │   ├── memory-store/                Memory MCP (decay, vector search, conflict)
│   │   ├── world-model/                 Codebase graph (predict, diff, causal)
│   │   ├── reward-system/               Reward scoring + value learning
│   │   ├── tool-tracker/                Usage tracking + agent reputation
│   │   ├── sop-tracker/                 Procedure matching
│   │   ├── reflexion/                   Self-refinement loop
│   │   ├── priority-queue/              Task scheduling
│   │   └── monitor/                     Health dashboard
│   └── plugin/                          brain-plugin.mjs (G1-G7 safety)
├── tests/
│   ├── runner.js                        Test runner (32 tests)
│   ├── brain-e2e-runner.js              Behavioral E2E scenarios
│   ├── circuits/                        14 circuit tests
│   ├── integration/                     3 integration tests
│   ├── e2e/                             8 E2E tests
│   ├── qc/                              4 quality control tests
│   └── unit/                            3 unit tests
├── docs/
│   ├── plans/                           Implementation plans
│   └── paper-5-gaps.md                  Paper alignment analysis
├── .omo/evidence/                       Test evidence files
├── oh-my-openagent.jsonc                OMO category config (24 categories)
└── install.js                           One-command installer
```

---

## Requirements

- **Node.js** 18+
- **OpenCode** (latest)
- **Oh My OpenAgent** (required — architecture foundation for categories, team_mode, and ulw-loop)
- **OS**: macOS, Linux, or Windows

---

## License

[MIT](LICENSE) © 2026 Joe Wong

---

*Built with reference to "Advances and Challenges in Foundation Agents" (arXiv 2504.01990).*
*Inspired by Sakana AI's Fugu (multi-model orchestration), Trinity (evolved coordination), and AB-MCTS (inference-time collaboration).*
