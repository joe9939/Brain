---
description: Foundation Agent brain commands — activate, status, inspect, deactivate
tools:
  read: true
  bash: true
  skill: true
---

<objective>
Route `/brain <subcommand>` to the correct brain operation.
Subcommands: (none)=activate+dashboard, status=health, memory=memory stats, trace=full trace, off=deactivate
</objective>

<process>

## Route by subcommand

If NO subcommand OR subcommand = "on" or "activate":
→ Go to [ACTIVATE]

If subcommand = "status" or "health":
→ Go to [STATUS]

If subcommand = "memory" or "mem":
→ Go to [MEMORY]

If subcommand = "trace" or "think":
→ Go to [TRACE]

If subcommand = "off" or "stop":
→ Go to [OFF]

Otherwise:
→ Show usage and run [STATUS]

If subcommand = "ablate" or "ablation":
→ Go to [ABLATE]

---

## [ABLATE] — Toggle brain regions on/off

Usage: `/brain ablate <region>`
Regions: amygdala, hippocampus, world-cortex, safety, attention, reward, self-enhance, thalamus, basal-ganglia, cerebellum, all

Show current ablation state:
- Active: <green regions>
- Ablated: <red regions>

To ablate: disable that region's sub-agent spawning. 
To restore: `/brain ablate <region> on`

Example: `/brain ablate amygdala` → amygdala will not be spawned for emotion detection.

---

## [ACTIVATE] — Full Brain Activation + Dashboard

1. Load these skills: memory-agent, world-model-agent, reward-agent, emotion-agent, attention-agent, safety-agent, self-enhance-agent, sisyphus-orchestrator

2. Verify MCP: call memory_retrieve(query="test",k=1). Note if errors.

3. Show dashboard:

```
┌──────────────────────────────────────────────┐
│     FOUNDATION AGENT BRAIN — ONLINE           │
│                                               │
│  MCP:  ✓ memory  ✗ world  ✗ reward           │
│  Skills: 19 loaded                           │
│  Agents: 5 defined                           │
│                                               │
│  Paper: 10/10 · 24 Components                 │
│  Commands: /brain status|memory|trace|off     │
└──────────────────────────────────────────────┘
```

---

## [STATUS] — Quick Health Check

1. Test memory-mcp: call memory_stats() → show counts
2. List installed skills: count files in .opencode/skills/
3. List defined agents: count files in .opencode/agents/
4. Show quick status table:

```
Brain Health:
  memory-mcp:    ✓ online (X records)
  world-model:   ✗ not built yet (Phase 2)
  reward-system: ✗ not built yet (Phase 2)
  skills:        19/19 files ready
  agents:        5/5 files ready
  /brain command: ✓ active
```

---

## [MEMORY] — Memory System Inspection

1. Call memory_stats() → show all table counts
2. Call memory_retrieve(query="recent", type="all", k=5) → show recent entries
3. Show memory health:

```
Memory Store:
  episodic:     N records
  semantic:     N entities + M relations
  procedural:   N SOPs (X proven, Y deprecated)
  working:      1 active task

  Decay: today X items decayed
  Anti-poison: active (8 patterns)
  Ebbinghaus: λ_episodic=0.05 λ_procedural=0.15 λ_semantic=0.02
```

---

## [TRACE] — Full Brain Trace (diagnostic mode)

Explain what happens when Sisyphus processes a request:
1. Show the P→C→A loop step by step
2. Show which skills are active at each step
3. Show fast-path checks (L1-L4)
4. Show component interaction matrix

Output a text diagram of the current request flowing through the brain.

---

## [OFF] — Deactivate Brain

Confirm with user, then:
"I have deactivated the Foundation Agent brain extensions. I am now operating as standard Sisyphus. Use `/brain` to reactivate."

</process>
