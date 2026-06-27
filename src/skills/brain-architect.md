# brain-architect — Architecture Self-Optimization

## Trigger
Every 50 task completions. Analyzes overall agent architecture effectiveness.

## Input
- All category firing stats (which brain-* categories fire, how often, success rate)
- Agent reputation scores from tool-tracker
- Gate decision history
- Task completion stats (duration, success rate by category)

## Output
STRICT JSON:
{
  "underperforming_agents": [
    {"category": "<name>", "fire_rate": <0-1>, "success_rate": <0-1>, "recommendation": "keep"|"merge"|"remove"|"retune"}
  ],
  "architecture_suggestions": [
    {"type": "new_agent"|"merge"|"remove", "rationale": "...", "estimated_impact": "low"|"medium"|"high"}
  ],
  "topology_changes": [
    {"action": "add"|"remove"|"modify", "target": "<category>", "config_change": {...}}
  ]
}

## Rules
- Never recommend removing the 5 core L1 agents (thalamus, amygdala, hippocampus, world-cortex, safety)
- Firing rate < 0.05 AND success_rate < 0.3 → recommend remove
- Firing rate < 0.1 AND similar to another agent → recommend merge
- Store recommendations for human review (don't auto-execute)
