# Brain Agent — Foundation Agent for OpenCode

Brain-inspired multi-agent system implementing [arXiv 2504.01990](https://arxiv.org/abs/2504.01990) (Foundation Agents).
24 brain-region agents, 9 MCP servers, 1 safety plugin (G1-G7), 32/32 tests passing.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b.svg)](https://arxiv.org/abs/2504.01990)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)
[![Oh-My-OpenAgent](https://img.shields.io/badge/OMO-integrated-blue)](https://github.com/code-yeongyu/oh-my-opencode)
[![Tests](https://img.shields.io/badge/Tests-32%2F32-brightgreen)]()
[![Signals](https://img.shields.io/badge/Signals-7%20competing-blue)]()

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

Brain Agent implements the Foundation Agent framework using a **signal competition** architecture. 7 neural signals (perceive, emotion, memory, reward, action, learning, safety) are **always active** and compete for the LLM's attention. At each tool boundary, the strongest signal injects a `[Brain: ...]` instruction directing the next action.

```
Input → [7 signals compute strength] → strongest signal wins → inject instruction → LLM acts → signals recompute
         ↑                                                                                          |
         └─────────────────── MCP as data bus (no global state injection) ──────────────────────────┘
```

**Key capabilities:**
- **Signal competition**: 7 parallel signals (perceive, emotion, memory, reward, action, learning, safety) — strongest drives next action. No sequential L1→L1.5→L2→L3 phase schedule
- **MCP is the data bus**: Sub-agents store results to `memory_store()` and read via `memory_retrieve()`. No L1_CONTEXT injection into prompts
- **5-way parallel perception**: thalamus + amygdala + hippocampus + world-cortex + safety, every message
- **Dynamic emotional propagation**: mood state (M^emo) influences all downstream layers via signal priority modulation
- **Winner-Take-Most gate selection**: urgency, reward, safety, and reliability weighted into gate score
- **Episodic + semantic + procedural memory**: SQLite-backed MCP with vector search
- **Memory lifecycle**: decay, consolidation, conflict detection, importance-weighted retention
- **Predictive world model**: BFS dependency impact analysis with precision/recall tracking
- **Agent reputation system**: reliability tracking per agent, weighted into gate competition
- **Safety gates G1-G7**: plugin-level tool interception (dangerous bash, injection, egress, compliance)
- **Value learning**: captures user feedback to adjust reward model

---

## Architecture

### Signal Competition Loop

The brain doesn't sequence — it competes. 7 signals compute strength on every tool boundary:

```
SIGNAL       PRIORITY  STRENGTH CONDITION               INSTRUCTION
───────────  ────────  ────────────────────────────────  ─────────────────────────────
perceive     5         l1.size < 5 → 1.0 - n*0.15      "Execute ALL 5 L1 agents..."
emotion      4         CAUTION/URGENT → 0.9             "Propagate mood to all layers"
                        else intensity * 0.5
safety       4         CAUTION mode → 0.9              "Fire brain-safety gate"
memory       3         SOPs matched → 0.8              "Use relevant memories"
                        episodic found → 0.5
reward       3         score < 3 → 0.8                 "Activate deep reasoning"
                        |td_error| > 1 → 0.6
action       2         swarm active → 0.8              "Decompose via swarm DAG"
learning     1         goals completed + L1 done → 0.7 "POST: reflexion + store"
```

**Winner selection**: `strength = raw_strength × priority`. Winner is deduplicated — only injects when the top signal changes. All others remain ready to fire when conditions shift.

### Phase Structure (Emergent, not Scheduled)

Because the strongest signal at any moment drives the next action, phases emerge naturally:

```
SIGNAL WINS     WHAT HAPPENS
─────────────   ───────────────────────────────────────────────────────
perceive        L1 — 5 parallel perception agents fire via task()
emotion         Mood propagation to all layers (M^emo → M^rew, M^goal)
memory          Retrieved memories / SOPs modulate downstream decisions
reward          Low score triggers deep reasoning (reward-cortex gate)
action          Swarm DAG: planner → coder → reviewer → tester
learning        POST cycle: reflexion → memory_store → score_action
safety          CAUTION mode: enhanced auditing on all gates
```

### Hook Mechanism (brain-hooks.mjs)

4 hook tiers implement the signal loop, wired through brain-plugin.mjs:

| Hook | Timing | Function |
|------|--------|----------|
| **T1** | `tool.execute.before` | Safety fast-path (G1) + inject winning `[Brain: ...]` signal instruction into output.messages |
| **T2** | `tool.execute.after` | Parse results → update mental state M_t (mood, reward, working memory) → signals auto-recompute |
| **T3** | `chat.message` | New input arrives → reset signals, start L1 perception |
| **T4** | `session.event` | Lifecycle events (idle→DMN, error→homeostasis, 6h→consolidation) |

### MCP as Data Bus

Sub-agents do NOT receive global state via prompt injection. Instead:

```
LLM → task(category="brain-thalamus", prompt="...memory_store(key='l1:thalamus:{session}', content=<JSON>)")
       ↓
thalamus agent runs → stores JSON result via memory_store() MCP tool
       ↓
brain-hooks.mjs T2 detects L1 completion → updates M_t
       ↓
Next signal instruction tells LLM: "memory_retrieve(key='l1:thalamus:{session}') for context"
```

This keeps the prompt clean — sub-agents pull what they need from MCP rather than receiving everything.

### Layer Detail

```
Layer 1 — Perception (always-on, 5 parallel agents)
  thalamus      → gate input, detect intents, urgency scoring
  amygdala      → emotion detection (URGENT/EXPLORE/SUPPORT/CAUTION/NORMAL)
  hippocampus   → memory retrieval (hybrid keyword + vector search)
  world-cortex  → codebase structure and impact analysis
  safety        → background security scan

Emotion Propagation (from L1 perceive signal)
  mood_decay    → smooth intensity between cycles, propagate to all layers
  reward_bias   → attention_priority_bias formula (clamped)
  contagion     → swarm agent moods vote into orchestrator mood
  homeostasis   → corrective actions on system anomaly

Layer 2 — Conditional Gate Competition (event-driven, WTA)
  Gate scoring: urgency×0.35 + reward_bias×0.25 + safety×0.25 + reliability×0.15
  Top-2 gates fire in parallel (bounded by attention budget)
  Consensus gate: when safety=strict AND uncertainty>threshold, 3-agent vote

  | Condition | Agent |
  |-----------|-------|
  | gate=BLOCK / CAUTION / danger pattern | brain-safety |
  | score < gate_thresholds.reward | brain-reward |
  | todowrite > gate_thresholds.attention | brain-attention |
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

POST — Learning
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

## Circuit Mechanisms

| Circuit | Principle | Implementation |
|---------|-----------|---------------|
| **Signal Competition** | 7 signals always active, strongest drives next action | `getStrongestSignal()` computes `strength × priority`, deduplicates winner |
| **Mental State M_t** | Cross-circuit shared state managed via MCP | MENTAL_STATE = {M^mem, M^wm, M^emo, M^goal, M^rew, M^θ} persisted via memory_store |
| **Versioned State** | Monotonic version counter + changelog per write | `MENTAL_STATE._version` incremented at state mutation |
| **Winner-Take-Most** | Gate scoring + top-2 parallel execution | `score = urgency×0.35 + reward×0.25 + safety×0.25 + reliability×0.15` |
| **Mood→All Layers** | Emotion signal propagates to all downstream layers | M^emo modulates reward multiplier, safety threshold, memory importance |
| **Emotional Contagion** | Swarm agent moods vote into orchestrator mood | T2 detection of swarm outputs → mood averaging |
| **Personality→Gates** | OCEAN traits modulate gate thresholds | `threshold = personality_base + mood_offset, clamped [0.0, 1.0]` |
| **Reward→Attention** | reward.score → attention_priority_bias → budget cap | Modulation within `MENTAL_STATE.attention_budget` |
| **Attention Budget** | 0-1 budget allocation, consumption per gate, renewal per cycle | Budget enforcement before L2 firing |
| **Safety Continuous** | Safety signal active whenever CAUTION mode | G1-G7 gates in plugin + safety signal injection |
| **World Predict→Verify** | BFS prediction before action, precision/recall after | world_predict + world_diff with trend tracking |
| **Homeostasis** | Insula fires → corrective actions (non-destructive) | Reduce load, raise safety, log |
| **Learning Loop** | POST learning signal → reflexion → memory_store → next cycle | `recent_lessons` retrieved from memory_store at L1 |
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
| reward-cortex | score < gate_thresholds.reward | Risk assessment |
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

## Safety Plugin (brain-plugin.mjs)

The plugin hooks into OpenCode's tool lifecycle and enforces 7 safety gates:

| Gate | Scope | Action |
|------|-------|--------|
| **G1** | Dangerous bash (rm -rf /, dd, mkfs, fdisk) | BLOCK |
| **G2** | Suspicious patterns (pipe to shell, base64 decode, eval) | WARN |
| **G3** | Sensitive files (.env, credentials, keys) + prompt injection | BLOCK |
| **G4** | Network egress (curl, wget, fetch to external hosts) | WARN |
| **G5** | Full-context injection (session reset, goal override) | BLOCK+LOG |
| **G6** | Compliance (force push, mass delete) | WARN |
| **G7** | Audit all tool executions | LOG |

Gates wire into T1 (tool.execute.before) and T2 (tool.execute.after) hooks. G2/G4/G6 warnings append `[SAFETY GATES]` messages to the LLM output.

---

## Test Suite

### Static Tests (32/32 PASS)

```bash
node tests/runner.js --all
```

| Category | Tests | What |
|----------|-------|------|
| UNIT | 3 | G1-G7 gate patterns, install logic, prompt format |
| INTEGRATION | 3 | Signal coexistence, L1 perceive, L2 conditional gates |
| E2E | 8 | Chat trigger, routing, dark mode, install cycle, activation, runtime, conformance |
| CIRCUITS | 14 | Circuit mechanisms + pathway tests |
| QC | 4 | OMO structure, architecture, circuit consistency, regression |

### Circuit Evidence Files

```bash
node tests/runner.js --circuits
```

Each test writes evidence to `.omo/evidence/<circuit-name>.md` with structured PASS/FAIL + check list.

### E2E Keyword Tests

```bash
node tests/brain-e2e-runner.js       # Run all scenarios
node tests/brain-e2e-runner.js --list # List available scenarios
```

Validates brain-master.md contains all expected circuit patterns via keyword scanning. 20 scenarios covering signals, gates, memory, safety, and learning phases.

### Testing Philosophy

- **33 keyword tests** (runner.js): verify circuit patterns exist in brain-master.md prompt — fast (~500ms), no runtime dependency
- **Real behavioral tests** (brain-e2e-runner.js): end-to-end validation that the orchestrator prompt contains all required circuit patterns
- Evidence-driven: each test writes structured PASS/FAIL evidence to `.omo/evidence/`

---

## Project Structure

```
brain-agent/
├── .opencode/skills/brain-master.md     Main orchestrator prompt (formal P→C→A loop, M_t state)
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
│   └── plugin/
│       ├── brain-hooks.mjs              Signal competition engine (T1-T4 hooks, 7 signals)
│       └── brain-plugin.mjs             Plugin wiring + G1-G7 safety gates
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
