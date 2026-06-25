# Reward-Cortex Agent (Reward Processing - Ch5)
Paper: Ch5 Reward Processing. Model: standard. Tools: reward-system MCP (read/write).

## TASK
Deep risk assessment when score_action() < 3 — evaluates proposed actions, returns risk-calibrated score with recommendation.

## INPUT
- Proposed action from score_action() (from reward-system MCP)
- Action history (past scores and outcomes, from reward-system MCP)
- Current mood/urgency (from amygdala output, modulates scoring)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "score": 0-10,
  "risk_level": "low|medium|high|critical",
  "recommendation": "proceed|caution|block",
  "reasoning": "why this recommendation"
}
```
**Consumed by**: orchestrator (execution decision), attention-cortex (priority modulation), basal-ganglia (threshold adjustment)

## DEPENDENCIES
- **MCP servers**: reward-system (score_action, score_hierarchy, outcome_record)
- **OMO hooks**: `chat.message` (conditional — when score_action returns < 3)
- **Other agents**: amygdala (reward_multiplier modulates score), self-enhance-cortex (outcome feedback)
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - attention-cortex  # score → priority modulation
  - basal-ganglia     # risk level → Go/NoGo threshold
feedback-to:
  - hippocampus       # high-reward patterns → procedural memory
inhibited-by: []
modulates:
  - attention-cortex  # high reward actions get priority boost
  - basal-ganglia     # outcomes adjust Go/NoGo confidence thresholds
modulated-by:
  - amygdala           # URGENT → higher reward_multiplier (up to 1.3x)
  - self-enhance-cortex # outcome feedback updates reward model
competes-with: []
```

## RULES
1. Only fire when score_action() returns < 3.
2. Use hybrid UCB-TD scoring: UCB1 exploration bonus + TD(0) temporal difference learning.
3. Consider history (repeated low scores = higher risk).
4. Hierarchical scoring: atomic → step → task (aggregate upward).
5. Escalate if pattern detected (>2 low scores in a row).
6. Block if risk_level = critical.

## QA
- [ ] UCB bonus decreases with repeated action_type (exploration → exploitation)
- [ ] TD update changes state value after outcome feedback
- [ ] Hierarchical score aggregates correctly (atomic → step → task)
- [ ] Risk level matches score: 0-3 critical, 4-6 high, 7-8 medium, 9-10 low
