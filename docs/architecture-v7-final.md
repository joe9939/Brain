# Foundation Agent Brain — Final Architecture v7

## Source: arXiv 2504.01990 · Implemented as OpenCode Primary Agent

---

## Three-Layer Model

```
LAYER 1 — Always Active (MCP + Plugin + Prompt, 0 extra tokens)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Hippocampus:    memory-mcp (6 tools, 7 tables, SQLite)
  Parietal:       world-model-mcp (4 tools, 19K files indexed)
  NAc/VTA:        reward-system-mcp (3 tools, hybrid scoring)
  Brainstem:      brain-plugin.mjs (L1 bash block, G3 file guard)
  PFC:            brain-master.md rules (R1-R8, G1-G7)
  OFC/ACC:        safety gates embedded in rules

LAYER 2 — Event-Driven (spawn on condition, ~3 agents per message)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EVERY message:  amygdala + hippocampus + world-cortex (3 parallel)
  HIGH risk:      safety review via prompt rules
  AFTER task:     self-enhance reflection

LAYER 3 — Complex Task (swarm pipeline, 3+ files / 5+ steps)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DLPFC:          swarm-planner → DAG
  Motor Cortex:   swarm-coder × n (parallel waves)
  ACC:            swarm-reviewer (fix loop, max 2)
  Cerebellum:     swarm-tester

META — Periodic (timed/triggered)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Self-Optimizer: every 3 tasks → prompt evolution
  Consolidation:  brain-consolidation.bat (every 6h)
```

---

## Paper Alignment

| Section | Coverage | Implementation |
|---------|----------|---------------|
| Ch2 Cognition | 4/4 | LLM + oracle + swarm-planner + SOP lifecycle |
| Ch3 Memory | 9/9 | memory-mcp (7 tables, full lifecycle + associative recall) |
| Ch4 World Model | 3/3 | world-model-mcp (import scanner + hybrid) |
| Ch5 Reward | 4/4 | reward-system-mcp (extrinsic/intrinsic/hybrid/hierarchical) |
| Ch6 Emotion | 3/3 | amygdala sub-agent + keyword map in prompt |
| Ch7 Perception | 1/1 | read + look_at + Playwright |
| Ch8 Action | 3/3 | swarm-coder/tester + permissions enforcement |
| Ch9 Self-Optimization | 3/3 | self-optimizer + SOP lifecycle + tool tracking |
| Ch11 Self-Improvement | 2/2 | reflection rules + scheduled consolidation |
| Ch13 MAS Design | 2/2 | swarm pipeline + dynamic topology rules |
| Ch15 Collaboration | 3/3 | fix loop + shared memory + wave dispatch |
| Part IV Safety | 10/10 | G1-G7 + plugin enforcement |
| **TOTAL** | **43/43 (100%)** | Ch3.3 covered via vector associative recall in memory-store |

---

## Deployment

```
.opencode/
├── skills/brain-master.md           Brain system prompt (3-layer rules)
├── agents/                          8 sub-agent MD files
├── mcp/memory-store/                6 tools, 7 tables
├── mcp/world-model/                 4 tools, import scanner
├── mcp/reward-system/               3 tools, hybrid scoring
├── brain-engine.js                  Autonomous coordinator
└── brain-consolidation.bat          Scheduled offline consolidation

~/.config/opencode/
├── opencode.json                    9 agents + 3 MCP servers
├── plugins/brain-plugin.mjs         L1+G3 safety enforcement
├── command/brain.md                 /brain command
└── brain.log                        Hook event trace log
```
