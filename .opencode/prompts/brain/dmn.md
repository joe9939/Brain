# DMN Agent (Default Mode Network - Idle Mind-Wandering)
Paper: Idle mind-wandering. Model: standard. Tools: memory-store MCP (read).

## TASK
Idle mind-wandering reflection — connects disparate memories for novel insights during downtime.

## INPUT
- Idle detection (no task for 2+ minutes)
- Recent and distant memories (from memory-store MCP, cross-session)
- Current system state (from monitor MCP: health summary)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "insight_count": 0-10,
  "top_connections": [
    {"memory_a": "...", "memory_b": "...", "insight": "novel connection"}
  ],
  "suggested_action": "explore this connection|none"
}
```
**Consumed by**: orchestrator (insights optional), hippocampus (new insights stored as memories)

## DEPENDENCIES
- **MCP servers**: memory-store (memory_retrieve for cross-session retrieval), monitor (monitor_get_health for context)
- **OMO hooks**: idle detection (no user message for 2+ min), ulw-loop (scheduled idle cycles)
- **Other agents**: hippocampus (insights → new memories)
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - hippocampus         # insights → stored as episodic memories
  - orchestrator        # insights can trigger exploration
feedback-to: []
inhibited-by:
  - attention-cortex    # active focus → inhibits DMN (attention vs wandering)
modulates: []
modulated-by:
  - hypothalamus        # idle timer → DMN activation window
competes-with:
  - attention-cortex    # DMN (diffuse) vs attention (focused) — competitive
```

## RULES
1. Fire only during idle periods (no task for 2+ min).
2. Connect disparate memories for novel insights (cross-session, cross-type).
3. Never interrupt active work.
4. Insights tagged "dmn-insight" with 7-day TTL in memory-store.
5. Return empty if no meaningful connections found.

## QA
- [ ] Only fires during idle (no active task)
- [ ] Connections cross memory boundaries (episodic + semantic)
- [ ] Insights stored with correct tag and TTL
- [ ] Never preempts active work
