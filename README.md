# 🧠 Brain Agent

**OpenCode plugin** implementing 7-signal competition architecture from [arXiv 2504.01990](https://arxiv.org/abs/2504.01990).  
20 brain-region agents, 8 MCP servers, G1-G7 safety gates. **149/149 tests passing.**

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b.svg)](https://arxiv.org/abs/2504.01990)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)
[![OMO](https://img.shields.io/badge/OMO-integrated-blue)](https://github.com/code-yeongyu/oh-my-opencode)
[![Tests](https://img.shields.io/badge/Tests-149%2F149-brightgreen)]()
[![CI](https://github.com/joe9939/Brain/actions/workflows/test.yml/badge.svg)]()

</div>

---

https://github.com/user-attachments/assets/visualizer-demo

> *Interactive 3D connectome showing real-time brain activity. [Run it yourself](visualizer/).*

---

## ✨ Features

| | | |
|---|---|---|
| 🧠 **7 Competing Signals** | 🛡️ **G1-G7 Safety Gates** | 🔄 **Real-Time Visualizer** |
| Perceive · Emotion · Memory · Reward · Action · Learning · Safety | Tool-level security at every layer | 3D brain activity in your browser |
| ⚡ **20 Brain-Region Agents** | 🔌 **8 MCP Servers** | 📊 **149 Tests** |
| Specialized sub-agents for every task | Memory, world model, reward, tools, SOPs… | 100% passing on CI |

---

## 🚀 Install

```bash
git clone https://github.com/joe9939/Brain.git
cd Brain
node install.js
node install.js --status          # verify installation
```

Restart OpenCode → press **Tab** → select **[brain]**.

> Requires Node.js 18+, [OpenCode](https://opencode.ai), and [Oh My OpenAgent](https://github.com/code-yeongyu/oh-my-opencode).

---

## 🎮 Quick Start

```bash
# All 149 tests
node tests/runner.js --all

# Brain circuit activity (behavioral)
node tests/runner.js --bc

# Unit tests only
node tests/runner.js --unit
```

### Trace a full session

```bash
node tests/runner.js --bc
```

Output shows every step: `message → signal competition → L1 dispatch → state changes → signal switch`.

---

## 🏗 Architecture

```
                      ┌─────────────────────────────┐
                      │      7 Signals Compute       │
                      │  perceive · emotion · memory │
                      │  reward · action · learning  │
                      │          safety              │
                      └──────────┬──────────────────┘
                                 │ strongest wins
                                 ▼
┌──────────┐           ┌──────────────────┐          ┌──────────┐
│  Input   │ ────────→ │  Brain Agent     │ ───────→ │   LLM    │
│ Message  │           │  injects signal   │          │  Acts    │
└──────────┘           └──────────────────┘          └────┬─────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
          ┌──────────────────┐
          │  M_t State Update │
          │  · recompute      │
          │  · switch winner  │
          └──────────────────┘
```

### Signal Competition

| Signal | Priority | Triggers When | Raw Strength |
|--------|----------|--------------|-------------|
| **perceive** | ×5 | L1 not complete | `1.0 − n × 0.15` |
| **emotion** | ×4 | CAUTION/URGENT mood | `0.9` / `intensity × 0.5` |
| **safety** | ×4 | CAUTION mode | `0.9` |
| **memory** | ×3 | SOPs or episodic found | `0.8` / `0.5` |
| **reward** | ×3 | score < 3 or \|td_error\| > 1 | `0.8` / `0.6` |
| **action** | ×2 | Complex task (swarm) | `0.8` |
| **learning** | ×1 | Goals done + L1 complete | `0.7` |

**Winner** = `raw × priority`. Deduplicated — only injects when top signal changes.

### Hook Tiers

| Hook | Timing | Role |
|------|--------|------|
| **T0** | `chat.messages.transform` | Inject brain status before LLM |
| **T1** | `tool.execute.before` | Safety gates G1-G7 + signal injection |
| **T2** | `tool.execute.after` | Update M_t state, recompute signals |
| **T3** | `chat.system.transform` | Detect brain mode from system prompt |
| **T4** | `session.event` | Lifecycle (idle, error), BrainTracer |
| **P** | `permission.ask` | Permission request logging |

---

## 🖥 Real-Time Visualizer

Watch every signal compete, every gate fire, and every brain region light up — in real time.

```bash
node visualizer/server.mjs
# Open http://localhost:3456
```

| Feature | Description |
|---------|------------|
| 🏐 **3D Connectome** | 20 brain regions on an interactive sphere |
| 📊 **Signal Bars** | Raw strength × priority = final score |
| 🔀 **Pathways** | Which circuit is active and why |
| 🛡️ **Gates** | G1-G7 live status (block/pass) |
| 📝 **Event Log** | Real-time trace of every cycle |
| 🖱 **Controls** | Drag to rotate · Scroll to zoom |

![Visualizer Demo](docs/visualizer-screenshot.png)

---

## 🔌 MCP Servers

| Server | Purpose | Tools |
|--------|---------|-------|
| **memory-store** | Episodic/semantic/procedural memory | store, retrieve, search, decay, consolidate |
| **world-model** | Codebase dependency graph | query, update, predict, diff |
| **reward-system** | Reward scoring + value learning | score_action, record_outcome, value_learn |
| **tool-tracker** | Usage patterns + agent reliability | track, stats, score_agent |
| **sop-tracker** | Procedure memory | register, match, ppo_score |
| **reflexion** | Self-refinement loop | start, add_observation, generate_lessons |
| **priority-queue** | Task scheduling | add, next, complete, prioritize |
| **monitor** | Health dashboard | get_health, get_alerts, report_event |

---

## 📁 Project Structure

```
src/
├── plugin/
│   ├── brain-hooks.mjs      # Signal competition engine (7 signals, M_t, BrainTracer)
│   └── brain-plugin.mjs     # G1-G7 safety gates + hook wiring
├── skills/
│   └── brain-master.md      # Orchestrator prompt
└── mcp/                     # 8 MCP servers
    ├── memory-store/
    ├── world-model/
    └── ...
tests/
├── runner.js                # Test runner (149 tests)
├── unit/                    # 60 unit tests
├── behavioral/              # 21 full-session trace tests
├── plugin/                  # 20 plugin hook tests
├── mcp/                     # 8 MCP server tests
├── tracer/                  # 8 BrainTracer tests
├── circuits/                # 12 circuit tests
├── integration/             # 7 integration tests
├── e2e/                     # 9 end-to-end tests
└── qc/                      # 4 quality control tests
visualizer/
├── server.mjs               # WebSocket + SSE server
└── index.html               # 3D brain visualization
```

---

## ✅ Test Status

```
All 149 tests passing

Unit:         60/60  ✅   Plugin:    20/20  ✅   MCP:        8/8  ✅
Behavioral:  21/21  ✅   Tracer:     8/8  ✅   Circuits:  12/12  ✅
Integration:  7/7  ✅   E2E:        9/9  ✅   QC:         4/4  ✅
```

---

## 📄 License

[MIT](LICENSE) © 2026 Joe Wong

*Built with reference to [Advances and Challenges in Foundation Agents](https://arxiv.org/abs/2504.01990) (arXiv 2504.01990).*
