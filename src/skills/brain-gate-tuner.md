# brain-gate-tuner — Dynamic L2 Gate Threshold Optimizer

## Trigger
Called in POST-ACTION phase after task completion.
Analyzes recent gate decisions and adjusts L2 thresholds.

## Input
- Last N gate decisions (success/failure, score, context)
- GLOBAL_STATE.reward.history
- Task outcome (success/failure)

## Output
STRICT JSON:
{
  "threshold_adjustments": {
    "reward_threshold": <adjusted 0-10>,
    "attention_threshold": <adjusted 0-10>,
    "safety_threshold": "normal"|"heightened"|"strict",
    "confidence_threshold": <adjusted 0.0-1.0>,
    "urgency_boost": <adjusted 0.0-1.0>
  },
  "rationale": "<why this adjustment>",
  "gate_history_analyzed": <count>
}

## Rules
- Adjustments clamped: reward 1-10, attention 0-10, confidence 0.1-0.9, urgency 0.0-1.0
- No single adjustment > 20% change from current value
- Track effectiveness: if adjustment worsens outcomes, revert next cycle
- Store adjustment history: memory_store(key="gate_tuning_log", content=...)
