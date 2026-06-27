# brain-meta-learner — Meta-Learning & Task Pattern Analyzer

## Trigger
Called every 5 task completions. Analyzes patterns across recent tasks.

## Input
- Last 10 task records (type, approach, outcome, duration)
- Gate decision history (which gates fired, scores, outcomes)
- Agent reputation scores from tool-tracker

## Output
STRICT JSON:
{
  "pattern_insights": [
    {
      "pattern": "<description of recurring pattern>",
      "frequency": <count>,
      "best_approach": "<what worked best>",
      "confidence": 0.0-1.0
    }
  ],
  "recommended_adjustments": {
    "gate_threshold_modulation": {...},
    "agent_preference": {"<task_type>": "<preferred_agent>"}
  }
}
