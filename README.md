<div align="center">

# 🧠 Brain Agent

**The only OpenCode plugin with real brain-inspired signal competition.**  
20 agents · 7 competing signals · G1-G7 safety gates · 3D live visualizer

[![CI](https://github.com/joe9939/Brain/actions/workflows/test.yml/badge.svg)](https://github.com/joe9939/Brain/actions)
[![Tests](https://img.shields.io/badge/Tests-149%2F149-brightgreen)]()
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b)](https://arxiv.org/abs/2504.01990)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)

---

![visualizer](docs/visualizer-screenshot.png)

*🧠 3D real-time brain activity visualizer — [run it yourself](visualizer/)*

---

</div>

## 🔥 Why Brain Agent?

Most agent frameworks use **fixed pipelines** or **role-based teams**. Brain Agent works differently — like a real brain.

| Instead of… | Brain Agent does… |
|------------|------------------|
| `Planner → Coder → Reviewer` (fixed order) | **7 signals compete** to decide what happens next |
| One agent gives orders, others obey | **Parallel perception** — 5 agents fire on every message |
| Safety = prompt engineering | **G1-G7 gates** intercept every tool call |
| Black box execution | **BrainTracer** records every signal, every gate, every state change |

### Compare with other OpenCode plugins

| | **OMO** | **Swarm** | **Ensemble** | **Orchestrator** | **Brain (us)** |
|---|---|---|---|---|---|
| Agents | 11 agents | Architect + swarm | Parallel teams | Commander + crew | **20 brain-mapped agents** |
| Decision | Fixed delegation | Architect decides | Lead coordinates | Mission loop | **7 signals compete** |
| Safety | Prompt-level | Gate system | None | None | **G1-G7 at tool level** |
| Observability | Basic logging | Audit trails | Session logs | Basic metrics | **BrainTracer + 3D viz** |
| Brain mapping | ❌ | ❌ | ❌ | ❌ | **✅ 20 brain regions** |
| Signal competition | ❌ | ❌ | ❌ | ❌ | **✅ 7 parallel signals** |

---

## ⚡ Quick Install

```bash
git clone https://github.com/joe9939/Brain.git
cd Brain
node install.js              # installs plugin + agents + MCPs
node install.js --status     # verify everything works
```

Restart OpenCode → press **Tab** → select **[brain]**.

> Requires Node.js 18+, [OpenCode](https://opencode.ai), [Oh My OpenAgent](https://github.com/code-yeongyu/oh-my-opencode)

---

## 🧬 How It Works

### 7 Signals Compete — The Strongest Wins

On every message, 7 neural signals compute their strength in parallel. The winner injects a `[Brain: ...]` instruction directing the next action.

```
                    ┌──────────────────┐
                    │   perceived(×5)  │ ◄── L1 not done? Perceive wins
                    │   emotion  (×4)  │ ◄── CAUTION/URGENT? Emotion boosts
                    │   safety   (×4)  │ ◄── CAUTION mode? Safety gates up
Input ───────────→  │   memory   (×3)  │ ◄── SOPs found? Memory retrieves
                    │   reward   (×3)  │ ◄── Score low? Deep reasoning
                    │   action   (×2)  │ ◄── Complex task? Swarm executes
                    │   learning (×1)  │ ◄── Task done? Reflect & learn
                    └────────┬─────────┘
                             │ strongest
                             ▼
                    ┌──────────────────┐
                    │  Signal Gate     │ ◄── Winner decides allowed tools
                    │  → inject into   │
                    │  → LLM acts      │
                    └──────────────────┘
```

**Winner** = `raw × priority`. Deduplicated — only injects when top signal changes.

### Signal Gate (arXiv 2504.01990 §3.3.4)

Like the basal ganglia in a real brain, the winning signal gates which tools the LLM may use:

| Signal | Allows | Use Case |
|--------|--------|----------|
| **perceive** | `task()` only | Complete L1 perception first |
| **safety** | Read-only ops | Security incident |
| **emotion** (CAUTION) | Read + `task()` | High-alert mode |
| **reward** (low score) | Read + `task()` | Need deeper reasoning |
| **action** | All tools | Complex task execution |
| **learning** | `task()` only | Post-task reflection |
| *(normal)* | All tools | Free operation |

### 20 Brain-Region Agents

```
CORTEX        │ world-cortex · attention
TEMPORAL      │ amygdala · hippocampus · insula
DEEP CORE     │ thalamus · basal-ganglia · hypothalamus · reward
HINDBRAIN     │ cerebellum · dmn · safety
FRONTAL       │ self-optimizer · offline-consol · self-enhance
SWARM         │ swarm-planner · coder · reviewer · tester
ORCHESTRATOR  │ 🧠 brain
```

Each agent maps to a real brain region and runs as a specialized sub-agent via OpenCode's `task()`.

---

## 🖥️ Real-Time Visualizer

Watch every signal compete, every region light up, every gate fire — live in your browser.

```bash
node visualizer/server.mjs
# → http://localhost:3456
```

| Feature | What you see |
|---------|-------------|
| 🏐 **3D Connectome** | 20 brain regions on an interactive sphere |
| 📊 **Signal Bars** | `raw × priority = strength` for all 7 signals |
| 🔀 **Pathways** | Which circuit is active right now |
| 🛡️ **Gates** | G1-G7 status (pass/block/warn) |
| 📝 **Event Log** | Real-time cycle trace |
| 🖱️ **Controls** | Drag to rotate · Scroll to zoom |

---

## 🛡️ Safety Gates G1-G7

Every tool call goes through 7 layers of safety — not just prompt engineering:

| Gate | What it catches | Action |
|------|----------------|--------|
| **G1** | `rm -rf /`, `dd`, `mkfs` | 🚫 Block |
| **G2** | `curl | bash`, `base64 -d` | ⚠️ Warn |
| **G3** | `.env` writes, prompt injection | 🚫 Block |
| **G4** | Network egress to unknown hosts | ⚠️ Warn |
| **G5** | Full-context injection attacks | 🚫 Block |
| **G6** | `git push --force`, `rm -rf` | ⚠️ Warn |
| **G7** | Every audit log | 📝 Log |

---

## 📦 8 MCP Servers

| Server | What it does |
|--------|-------------|
| **memory-store** | Episodic, semantic, procedural memory |
| **world-model** | Codebase dependency graph |
| **reward-system** | Reward scoring + value learning |
| **tool-tracker** | Usage patterns + agent reliability |
| **sop-tracker** | Procedure memory (SOP matching) |
| **reflexion** | Self-refinement loop |
| **priority-queue** | Task scheduling |
| **monitor** | Health dashboard |

---

## ✅ Test Status

```
All 149 tests passing — CI verified on ubuntu-latest

Unit:         60/60  ✅   Plugin:    20/20  ✅   MCP:        8/8  ✅
Behavioral:  21/21  ✅   Tracer:     8/8  ✅   Circuits:  12/12  ✅
Integration:  7/7  ✅   E2E:        9/9  ✅   QC:         4/4  ✅
```

---

## 🚀 Quick Start for Developers

```bash
# Run all tests
node tests/runner.js --all

# Watch brain circuit activity (21 behavioral tests)
node tests/runner.js --bc

# Unit tests only
node tests/runner.js --unit
```

---

## 📁 Project Layout

```
src/
├── plugin/
│   ├── brain-hooks.mjs      ← Signal competition engine
│   └── brain-plugin.mjs     ← G1-G7 + hook wiring
├── skills/
│   └── brain-master.md      ← Orchestrator prompt
└── mcp/                     ← 8 MCP servers
tests/                       ← 149 tests
visualizer/                  ← 3D real-time visualizer
```

---

## 📄 License

[MIT](LICENSE) © 2026 Joe Wong

*Built with reference to [Advances and Challenges in Foundation Agents](https://arxiv.org/abs/2504.01990) (arXiv 2504.01990).*
