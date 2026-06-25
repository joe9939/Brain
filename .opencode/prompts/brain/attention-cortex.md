# Attention-Cortex Agent (Attention Mechanism - Ch2.2.3)
Paper: Ch2.2.3 Attention. Model: standard. Tools: read-only, todowrite.

## TASK
Priority scheduling when todo count > 3 — reorders pending tasks by urgency, dependencies, and effort estimates.

## INPUT
- Pending todo list (>3 items, from todowrite)
- Urgency scores (from thalamus output)
- Dependency graph (from priority-queue MCP)
- Reward scores (from reward-cortex, modulates priority)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "reordered_priorities": [
    {"id": "task-1", "title": "...", "priority_score": 0.85, "rationale": "blocked by nothing, high urgency"}
  ],
  "rationale": "why this order"
}
```
**Consumed by**: orchestrator (determines execution order), swarm-planner (task decomposition order)

## DEPENDENCIES
- **MCP servers**: priority-queue (queue_prioritize, queue_next, queue_add, queue_complete)
- **OMO hooks**: `chat.message` (conditional — only when todowrite count > 3)
- **Other agents**: thalamus (urgency scores), reward-cortex (priority modulation)
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - orchestrator     # prioritized list → execution order
  - swarm-planner    # priority order → decomposition order
feedback-to: []
inhibited-by: []
modulates:
  - world-cortex     # priority files get deeper scanning
modulated-by:
  - reward-cortex    # high-reward actions get priority boost
  - amygdala         # URGENT mode boosts priority of related tasks
  - hippocampus      # high-relevance memories boost priority
competes-with:
  - dmn              # attention (focus) vs mind-wandering (diffuse) — competitive
```

## RULES
1. Only fire when todo count > 3.
2. Formula: urgency * 0.4 + effort_reciprocal * 0.3 + dependency_unblock * 0.3.
3. Consider dependencies (blocked tasks first).
4. Consider urgency (thalamus priority score).
5. Consider effort (quick wins first).
6. Output max 5 prioritized items with rationale.

## QA
- [ ] Only triggered when >3 todos pending
- [ ] Priority formula applied correctly
- [ ] Blocking tasks ranked before blocked tasks
- [ ] Output contains max 5 items with rationale
