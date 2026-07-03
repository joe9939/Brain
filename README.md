# Brain Agent — Foundation Agent for OpenCode

Brain-inspired multi-agent system implementing [arXiv 2504.01990](https://arxiv.org/abs/2504.01990) (Foundation Agents) with **7-signal competition architecture**.
20 brain-region agents, 8 MCP servers, 1 safety plugin (G1-G7), **149/149 tests passing**.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b.svg)](https://arxiv.org/abs/2504.01990)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)
[![Oh-My-OpenAgent](https://img.shields.io/badge/OMO-integrated-blue)](https://github.com/code-yeongyu/oh-my-opencode)
[![Tests](https://img.shields.io/badge/Tests-149%2F149-brightgreen)]()
[![Signals](https://img.shields.io/badge/Signals-7%20competing-blue)]()
[![MCP](https://img.shields.io/badge/MCP-8%2F8-green)]()

</div>

---

## Quick Start

```bash
# Install brain-agent (plugin, agents, MCP, config)
node install.js

# Verify everything is set up
node install.js --status

# Run unit + behavioral tests
node tests/runner.js --unit --bc

# Run MCP tests
node tests/runner.js --mcp
```

Restart OpenCode. Press Tab -> select **[brain]**. That's it.

> Requires [Node.js](https://nodejs.org) 18+, [OpenCode](https://opencode.ai), and [Oh My OpenAgent](https://github.com/code-yeongyu/oh-my-opencode).
> Brain Agent is built ON TOP of Oh My OpenAgent — OMO categories and task() delegation are the architecture foundation.

---

## What is Brain Agent?

Brain Agent implements the Foundation Agent framework using a **signal competition** architecture. 7 neural signals (perceive, emotion, memory, reward, action, learning, safety) are **always active** and compete for the LLM's attention. At each tool boundary, the strongest signal injects a `[Brain: ...]` instruction directing the next action.

```
Input → [7 signals compute strength] → strongest signal wins → inject instruction → LLM acts → signals recompute
```

**Key capabilities:**
- **Signal competition**: 7 parallel signals — strongest drives next action. No sequential L1→L2→L3 phase schedule
- **5-way parallel perception**: thalamus + amygdala + hippocampus + world-cortex + safety, every message
- **Safety gates G1-G7**: plugin-level tool interception (dangerous bash, injection, egress, compliance)
- **BrainTracer**: built-in observability module recording every hook event, signal winner, gate block, and M_t state change
- **MCP services**: 8 standalone MCP servers for memory, world model, reward, tool tracking, SOP, reflexion, queue, monitor

---

## Architecture

### Signal Competition Loop

7 signals compute strength on every tool boundary:

| Signal | Priority | Condition | Strength |
|--------|----------|-----------|----------|
| perceive | 5 | l1.size < 5 | 1.0 - n * 0.15 |
| emotion | 4 | CAUTION/URGENT | 0.9 |
| | | else | intensity * 0.5 |
| safety | 4 | CAUTION mode | 0.9 |
| memory | 3 | SOPs matched | 0.8 |
| | | episodic found | 0.5 |
| reward | 3 | score < 3 | 0.8 |
| | | td_error > 1 | 0.6 |
| action | 2 | swarm active | 0.8 |
| learning | 1 | goals done + L1 done | 0.7 |

Winner = `raw_strength × priority`. Deduplicated — only injects when the top signal changes.

### Hook Tiers

The brain hooks into OpenCode via these plugin hooks:

| Hook | Timing | Function |
|------|--------|----------|
| **T0** | `experimental.chat.messages.transform` | Inject brain status before LLM sees messages |
| **T1** | `tool.execute.before` | Safety gates (G1-G7) + signal injection into output.messages |
| **T2** | `tool.execute.after` | M_t state update + signal recomputation |
| **T3** | `experimental.chat.system.transform` | Detect brain mode from system prompt |
| **T4** | `session.event` | Lifecycle events (idle, error) + BrainTracer recording |
| **S0** | `permission.ask` | Log tool permission requests |

---

## Test Suite

### Current status: 149 tests, 0 failures

```
Category      Count  Status
──────         ─────  ──────
Unit tests    60     ✅ All pass
MCP tests      8     ✅ All pass
Behavioral    21     ✅ All pass
Plugin tests  20     ✅ All pass
Tracer tests   8     ✅ All pass
Circuits      12     ✅ All pass
Integration    7     ✅ All pass
QC tests       4     ✅ All pass
E2E tests      9     ✅ All pass
──────         ─────  ──────
Total        149     ✅ 149/149
```

Run tests:

```bash
# All tests
node tests/runner.js --unit --mcp --bc --plugin --tracer --circuits --integration --qc --e2e

# Unit only
node tests/runner.js --unit

# Behavioral/pathway tests (shows circuit activity)
node tests/runner.js --bc
```

### Full Session Trace Tests

Tests that simulate complete message-to-response cycles, logging all internal activity:

| Test | Scenario | Verifies |
|------|----------|----------|
| TRACE: full session lifecycle | Normal + urgent messages | L1 firing, signal switching, M_t updates, BrainTracer |
| TRACE: normal conversation | Greeting → L1 → tool call | perceive wins, L1 completes, signal switches |
| TRACE: complex task swarm | 16-word complex task | swarm=true, action signal |
| TRACE: dangerous command | rm -rf, .env write | G1 blocks, G3/G5 in plugin layer |

---

## Project Structure

```
brain-agent/
├── install.js                    One-command installer
├── src/
│   ├── plugin/
│   │   ├── brain-hooks.mjs       Signal competition engine (T1-T4 hooks, 7 signals, BrainTracer)
│   │   └── brain-plugin.mjs      Plugin wiring + G1-G7 safety gates
│   ├── skills/brain-master.md    Main orchestrator prompt (9-line entry point)
│   └── mcp/*/                    MCP servers (memory-store, world-model, reward-system, tool-tracker, ...)
├── tests/
│   ├── runner.js                 Test runner (149 tests)
│   ├── unit/                     Unit tests
│   ├── behavioral/               Full-session trace and pathway tests
│   ├── plugin/                   Plugin hook tests
│   ├── mcp/                      MCP server tests
│   └── tracer/                   BrainTracer observability tests
├── .opencode/skills/             Deployed orchestration prompt
└── config/                       Install templates
```

## MCP Servers

| Server | Tools | Purpose |
|--------|-------|---------|
| memory-store | memory_store/retrieve/summarize/search | Episodic/semantic/procedural memory |
| world-model | world_query/update/predict/diff | Codebase dependency graph |
| reward-system | score_action/record_outcome/value_learn | Reward scoring with user feedback |
| tool-tracker | track_tool_use/get_tool_stats/score_agent | Usage patterns, agent reliability |
| sop-tracker | sop_register/match/decision/ppo_score | Procedure memory |
| reflexion | reflexion_start/add_observation/generate_lessons | Self-refinement loop |
| priority-queue | queue_add/next/complete/prioritize | Task scheduling |
| monitor | monitor_get_health/get_alerts/report_event | Health dashboard |

---

## License

[MIT](LICENSE) © 2026 Joe Wong

*Built with reference to "Advances and Challenges in Foundation Agents" (arXiv 2504.01990).*
