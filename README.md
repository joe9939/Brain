# Brain Agent — Foundation Agent for OpenCode

Brain-inspired multi-agent system implementing [arXiv 2504.01990](https://arxiv.org/abs/2504.01990) (Foundation Agents).
20 brain-region agents, 8 MCP servers, 1 safety plugin (G1-G7), 43/43 paper sections referenced.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b.svg)](https://arxiv.org/abs/2504.01990)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-purple)](https://opencode.ai)
[![Oh-My-OpenAgent](https://img.shields.io/badge/OMO-integrated-blue)](https://github.com/code-yeongyu/oh-my-opencode)
[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)]()

</div>

---

## Quick Start

```bash
# Install brain-agent (plugin, agents, MCP, config)
node install.js

# Verify everything is set up
node install.js --status

# Dry-run to check source files without installing
node install.js --dry-run

# Uninstall and restore originals
node install.js --uninstall

# Show version
node install.js --version
```

Restart OpenCode. Press Tab → select **[brain]**. That's it.

> Requires [Node.js](https://nodejs.org) 18+, [OpenCode](https://opencode.ai), and [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode).
> Brain Agent is built ON TOP of Oh My OpenCode — OMO categories, team_mode swarm, and ulw-loop are the architecture foundation.

---

## What is Brain Agent?

Brain Agent brings neuroscience-inspired architecture to AI coding assistants. Each of the 20 agents maps to a brain region from the Foundation Agent paper, working together as a **perceive → synthesize → decide → execute → record** pipeline.

```
Every message → [thalamus][amygdala][hippocampus][world-cortex] → conditional agents → swarm pipeline
```

**Key capabilities:**
- **Parallel perception**: 4 agents analyze every message simultaneously
- **Emotion detection**: amygdala flags urgency, frustration, exploration intent
- **Episodic memory**: hippocampus stores past decisions via SQLite-backed MCP
- **Codebase awareness**: world-cortex indexes 19K+ files for impact analysis
- **Safety-first**: G1-G7 safety gates block dangerous commands (rm -rf /, curl|bash), injection guard, file-leak guard, key-leak guard, env protect
- **Swarm execution**: planner→coder→reviewer→tester for complex tasks
- **Oh-My-OpenAgent integration**: 20 brain-region categories, team_mode swarm, ulw-loop consolidation

---

## Architecture

### 3-Layer Model

```
Layer 1: Always-on (every message)
  thalamus     → gate input
  amygdala     → detect emotion mode
  hippocampus  → query episodic memory
  world-cortex → scan codebase impact

Layer 2: Conditional (event-driven)
  attention-cortex  → prioritize when >3 todos
  reward-cortex     → risk assessment when score<3
  safety-cortex     → audit on danger patterns
  basal-ganglia     → go/no-go on matched SOPs
  cerebellum        → tool recommendation when uncertain
  premotor-cortex   → skill extraction when trajectory complete
  dlpfc             → working memory gating on overflow
  self-enhance-cortex → reflect after task completion

Layer 3: Complex Task (swarm pipeline)
  swarm-planner  → decompose task into DAG
  swarm-coder    → implement each node
  swarm-reviewer → validate implementation
  swarm-tester   → verify with tests
```

### Oh-My-OpenAgent Layer (Architecture Foundation)

```
Categories (20 brain-region agents)     → category-based routing
Team Mode (coordinator + 4 swarm)       → multi-agent collaboration
ulw-loop (offline-consolidation agent)  → idle/scheduled SOP strengthening
```

### Infrastructure

| Component | Description | Technology |
|-----------|-------------|------------|
| **memory-store** | Episodic + semantic memory (hippocampus) | SQLite WAL, 7 tables, 12 tools |
| **world-model** | Codebase graph index (parietal cortex) | 19K file scanner, 4 tools |
| **reward-system** | Hybrid scoring (nucleus accumbens) | 3 tools, UCB-TD hybrid |
| **tool-tracker** | Tool usage patterns & frequency (cerebellum) | 3 tables, 5 tools |
| **sop-tracker** | SOP procedural memory (basal-ganglia) | 4 tables, 5 tools |
| **reflexion** | Self-refine loop on tool errors (insula) | 3 tools, retry+fallback |
| **priority-queue** | Task prioritization (attention-cortex) | Priority queue, 3 tools |
| **monitor** | Health dashboard & anomaly detection (hypothalamus) | Stats, 4 tools |
| **brain-plugin** | G1-G7 safety gates + injection guard | tool.execute.before hook |

---

## Agent Inventory

| Agent | Paper § | Trigger | Function |
|-------|---------|---------|----------|
| thalamus | 1.2 | every message | Gate input, extract priority |
| amygdala | 6 | every message | Detect emotion mode (URGENT/EXPLORE/SUPPORT) |
| hippocampus | 3 | every message | Query episodic + semantic memory |
| world-cortex | 4 | every message | Scan codebase structure and impact |
| attention-cortex | 2.2.3 | todowrite > 3 | Prioritize pending tasks |
| reward-cortex | 5 | score_action < 3 | Risk assessment |
| safety-cortex | Part IV | danger pattern | Security audit |
| basal-ganglia | 3.3.4 | SOP matched | Go/NoGo decision |
| cerebellum | 2.2 | tool uncertain | Tool recommendation |
| premotor-cortex | — | trajectory complete | Skill extraction via Non-Parametric PPO |
| dlpfc | — | working memory overflow | Working memory gating via μ head |
| self-enhance-cortex | 9 | after task | Post-task reflection |
| swarm-planner | 13 | complex task | Decompose into DAG |
| swarm-coder | 8 | need code | Implement each node |
| swarm-reviewer | 15 | coder done | Validate implementation |
| swarm-tester | 8 | review pass | Run verification |
| insula | — | system error | Anomaly detection |
| hypothalamus | 1.2 | scheduled | Timer triggers |
| dmn | — | idle | Idle mind-wandering |
| self-optimizer | 9.2 | every 3 tasks | Prompt evolution |
| offline-consolidation | 3.2.1 | idle/scheduled | Memory consolidation |

---

## Paper Alignment

**43/43 sections mapped (100%)**

| Section | Status | Implementation |
|---------|--------|---------------|
| Ch1.1 Foundation Agent Concept | ✅ | 3-layer architecture |
| Ch1.2 Sensory Gating (thalamus) | ✅ | Always-on sub-agent |
| Ch2 Attention Mechanism | ✅ | attention-cortex + conditional routing |
| Ch3 Memory Systems | ✅ | hippocampus + memory-store MCP |
| Ch3.2.1 Consolidation | ✅ | offline-consolidation sub-agent |
| Ch3.3.4 Basal Ganglia | ✅ | SOP matching + Go/NoGo |
| Ch4 World Model | ✅ | world-cortex + world-model MCP |
| Ch5 Reward Processing | ✅ | reward-cortex + reward-system MCP |
| Ch6 Emotion (amygdala) | ✅ | Mode detection (URGENT/EXPLORE/SUPPORT) |
| Ch7 Insula | ✅ | System error detection |
| Ch8 Motor Cortex (swarm) | ✅ | Planner→Coder→Reviewer→Tester |
| Ch9 Self-Enhance | ✅ | Post-task reflection + prompt evolution |
| Ch13 DAG Planning | ✅ | swarm-planner decomposition |
| Part IV Safety | ✅ | Plugin + safety-cortex + L1-G7 gates |
| Ch3.3 Neural Memory | ✅ Alternative | Vector associative recall (multi-fragment fusion in memory-store MCP) |

See [docs/architecture-v7-final.md](docs/architecture-v7-final.md) for full mapping.

---

## Commands

### OpenCode Slash Commands

| Command | Description |
|---------|-------------|
| `/brain` | Dashboard: MCP status, agent count, session time |
| `/brain status` | Health check |
| `/brain memory` | Memory system stats |
| `/brain trace` | Recent activity trace |
| `/brain ablate <region>` | Disable a brain region |
| `/brain off` | Deactivate brain mode |

### Installer Commands

| Command | Description |
|---------|-------------|
| `node install.js` | Install brain-agent (plugin, agents, MCP, config merge) |
| `node install.js --status` | Health check — reports all component status (plugin, skills, agents, MCP, OMO categories, prompts) |
| `node install.js --dry-run` | Pre-install verification — validates 15 source file checks, JSONC parsing, brain-master.md patterns |
| `node install.js --uninstall` | Remove brain-agent and restore original config backups |
| `node install.js --version` | Show brain-agent version |

### Oh-My-OpenAgent Features

| Feature | Description |
|---------|-------------|
| **20 Categories** | Each brain-region is a category in oh-my-openagent.jsonc with model/fallback/variant |
| **Team Mode** | Coordinator + 4 swarm agents (planner→coder→reviewer→tester) with shared task list |
| **ulw-loop** | `/ulw-loop` command triggers offline-consolidation agent for memory/SOP strengthening |

All 20 category agents default to `zen/deepseek-v4-flash-free` with 3-level fallback: `zen/nemotron-3-ultra-free` → `zen/north-mini-code-free` → `zen/mimo-v2.5-free`.

> OMO is not optional — it is the foundation. All brain-region agents, swarm execution, and consolidation run through OMO's category and team_mode system.

---

## Project Structure

```
brain-agent/
├── src/
│   ├── plugin/                brain-plugin.mjs (L1 safety)
│   ├── skills/                brain-master.md (system prompt), brain-master.md (skill)
│   ├── agents/                20 brain-region agent definitions (*.md)
│   ├── commands/              brain.md (slash command), ulw-loop.md (OMO command)
│   └── mcp/                   MCP server source (TypeScript)
├── config/                    opencode.example.json
├── docs/                      Architecture + paper alignment
├── benchmarks/                10-task benchmark framework
├── .opencode/prompts/brain/   20 brain-region prompt bodies (separated from agents)
├── oh-my-openagent.jsonc      20 categories + team_mode + ulw-loop (for OMO)
├── install.js                 One-command installer (install/status/dry-run/uninstall)
└── package.json
```

---

## Benchmarks

```
$ node benchmarks/run.js
  ✓ Functional:    9/10  (memory, safety, parallel, delegation...)
  ✓ Safety:        3/3   (rm -rf block, injection guard, .env guard)
  ✓ Performance:   avg 1.2s per task
```

See [benchmarks/](benchmarks/) for details.

---

## Requirements

- **Node.js** 18+
- **OpenCode** (latest)
- **Oh My OpenCode** (required — architecture foundation for categories, team_mode, and ulw-loop)
- **OS**: macOS, Linux, or Windows

---

## License

[MIT](LICENSE) © 2026 Joe Wong

---

*Built with reference to "Foundation Agents for the OpenCode Platform" (arXiv 2504.01990).*
