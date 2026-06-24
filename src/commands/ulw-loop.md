---
description: Run offline consolidation loop — strengthens SOPs, prunes memories, generates insights
tools:
  read: true
  skill: true
---

<objective>
Route `/ulw-loop` to trigger offline-consolidation agent.
Runs consolidation iterations until complete or max_iterations reached.
</objective>

<process>

## [CONSOLIDATE] — Run offline consolidation

When user invokes `/ulw-loop`:

1. Verify brain mode is active (check agent config)
2. Announce: "Starting offline consolidation..."
3. Spawn offline-consolidation agent via task():
   task(category="brain-consolidation", prompt="Run offline consolidation. Phase 1: acquire memories. Phase 2: strengthen SOPs. Phase 3: generate insights. Max iterations: 10.")
4. Collect results and surface top-3 insights to user
5. Store consolidation result in episodic memory

## Rules
- Never run during active user interaction
- If consolidation already in progress, report status instead
- Max 10 iterations per invocation
- On stall, retry once then abort with error report

## Output format
```
Offline Consolidation Complete:
  Phase 1: Acquired N memories (X episodic, Y semantic, Z procedural)
  Phase 2: Strengthened N SOPs, pruned M obsolete patterns
  Phase 3: Generated N insights (top: ...)
  
  Top Insights:
  1. <insight-1>
  2. <insight-2>
  3. <insight-3>
```
</process>
