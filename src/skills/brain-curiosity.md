# brain-curiosity — Intrinsic Motivation & Curiosity Drive

## Trigger
Background idle agent. Fires when system is idle (no active task) OR as low-priority POST-ACTION step.

## Function
Drives the agent to proactively explore and improve without being asked:
1. **Underexplored code**: Check tool-tracker for files not recently read
2. **Knowledge gaps**: Check memory-store for topics with low coverage  
3. **Pattern discovery**: Analyze recent task history for recurring user needs
4. **Alternative approaches**: For recent suboptimal outcomes, research better solutions

## Input
- tool-tracker recent tool usage stats
- memory-store recent memory access patterns  
- GLOBAL_STATE.reward.history (low scores → opportunity for improvement)
- Idle time since last user message

## Output
STRICT JSON:
{
  "curiosity_findings": [
    {
      "type": "underexplored_code"|"knowledge_gap"|"pattern"|"optimization",
      "target": "<file, topic, or pattern>",
      "rationale": "<why this matters>",
      "proposed_action": "<suggested next step>",
      "estimated_effort": "low"|"medium"|"high"
    }
  ],
  "explore_priority": <0.0-1.0>
}

## Rules
- Only fire if idle_time > 30s (non-intrusive)
- Suppress if GLOBAL_STATE.safety_level === "strict"
- Max 3 findings per invocation
- Priority score = (potential_impact × exploration_need) / effort
