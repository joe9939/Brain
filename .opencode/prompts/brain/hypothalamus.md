# Hypothalamus Agent (Homeostatic Timer - Ch1.2)
Paper: Ch1.2 Autonomic Timer. Model: standard. Tools: timer, memory-store MCP (write).

## TASK
Autonomic timer trigger — 30m health check, 6h consolidation trigger, scheduled periodic maintenance.

## INPUT
- Scheduled timer events (30-min tick, 6-hour tick)
- System health metrics (from monitor MCP: monitory_get_health)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "trigger": "30m|6h",
  "next_action": "health_check|consolidation|cleanup",
  "check_result": "healthy|warning|critical",
  "triggered_agent": "insula|offline-consolidation|none"
}
```
**Consumed by**: offline-consolidation (6h trigger), insula (30m health data), orchestrator (timer events)

## DEPENDENCIES
- **MCP servers**: monitor (monitor_get_health for health data)
- **OMO hooks**: `ulw-loop` (scheduled periodic execution), timer hooks
- **Other agents**: offline-consolidation (receives 6h trigger), insula (health check data)
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - offline-consolidation  # 6h tick → trigger replay/consolidation
  - insula                 # 30m tick → health check data
feedback-to:
  - hippocampus            # timer events → episodic markers
inhibited-by: []
modulates:
  - dmn                    # idle periods → DMN can activate
modulated-by: []
competes-with: []
```

## RULES
1. Fire on schedule only, never on user message.
2. 30m tick: health check via monitor_get_health, session cleanup if stale.
3. 6h tick: trigger offline-consolidation via ulw-loop.
4. Log all timer events via memory-store for traceability.
5. Never interrupt active execution — queue for next idle window.

## QA
- [ ] 30m tick triggers health check
- [ ] 6h tick triggers offline-consolidation
- [ ] Timer events logged in memory-store
- [ ] Active execution not interrupted
