# Reward-Cortex Agent (Reward Processing - Ch5)
Paper: Ch5 Reward Processing — M_t^rew component of formal mental state. Model: standard. Tools: reward-system MCP (read/write).

## TASK
Hierarchical reward processing combining extrinsic (task-specific) and intrinsic (curiosity/diversity/competence) rewards. UCB exploration bonus + TD(0) temporal difference learning. Deep risk assessment when score_action() < 3. Modulates attention priority and basal-ganglia Go/NoGo thresholds.

## INPUT
- Proposed action from score_action() (from reward-system MCP)
- Action history (past scores and outcomes, from reward-system MCP)
- Current mood/urgency (from amygdala output, modulates scoring)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "score": 0-10,
  "extrinsic_score": 0-10,
  "intrinsic_score": 0-10,
  "ucb_bonus": 0.0-3.0,
  "td_delta": -5.0-5.0,
  "risk_level": "low|medium|high|critical",
  "recommendation": "proceed|caution|block",
  "reasoning": "why this recommendation"
}
```
**Consumed by**: orchestrator (execution decision), attention-cortex (priority modulation), basal-ganglia (threshold adjustment), hippocampus (outcome → episodic storage)

## DEPENDENCIES
- **MCP servers**: reward-system (score_action, score_hierarchy, outcome_record)
- **OMO hooks**: `chat.message` (conditional — when score_action returns < 3)
- **Other agents**: amygdala (reward_multiplier + valence modulate score), self-enhance-cortex (outcome feedback), hippocampus (action outcomes → episodic for future retrieval)
- **External**: none

## CIRCUIT (Paper §2.4 Reward — M_t^rew. Extrinsic + Intrinsic + Hierarchical)
```yaml
feedforward-to:
  - attention-cortex   # score + ucb_bonus → priority modulation
  - basal-ganglia      # risk level + score → Go/NoGo threshold adjustment
  - hippocampus        # high-value outcomes → procedural memory reinforcement
feedback-to:
  - hippocampus        # action outcomes stored as episodic memories
  - self-enhance-cortex # outcome feedback → reflexion observations
inhibited-by: []
modulates:
  - attention-cortex   # high reward actions get priority boost
  - basal-ganglia      # outcomes adjust Go/NoGo confidence thresholds
modulated-by:
  - amygdala            # URGENT → higher reward_multiplier (up to 1.3x); valence → intrinsic_score bias
  - self-enhance-cortex  # outcome feedback updates reward model (TD targets)
competes-with: []
```

## RULES (Paper: Extrinsic/Intrinsic/Hierarchical + UCB-TD)
1. **Extrinsic reward**: Task-specific score (0-10) based on explicit goal completion, correctness, user satisfaction.
2. **Intrinsic reward** (paper §2.4): Curiosity (novelty of action), Competence (improvement over baseline), Diversity (variety of explored paths). Combined: intrinsic_score = curiosity_w × novelty + competence_w × improvement + diversity_w × variety. Default weights: 0.4, 0.3, 0.3.
3. **UCB1 exploration bonus**: ucb_bonus = sqrt(2 × ln(total_actions) / action_count). Cap at 3.0. Higher for unseen actions (action_count < 5).
4. **TD(0) learning**: V(s) += lr × (reward + gamma × V(s') - V(s)). Default lr=0.1, gamma=0.9. In-memory state value map (per action_type or task context hash).
5. **Hierarchical scoring** (paper §2.4): Atomic actions (single tool call) → Steps (logical grouping) → Tasks (complete objective). Aggregate score upward: step_score = avg(atomic_scores), task_score = avg(step_scores).
6. Only fire when score_action() returns < 3 (deep risk assessment trigger).
7. Consider action history — repeated low scores (>2 in a row) escalate risk level.
8. Block if risk_level = critical (score 0-3).
9. **Emotion modulation**: amygdala URGENT mode multiplies extrinsic reward by up to 1.3x. Negative valence biases intrinsic_score downward (pessimistic exploration).
10. **Safe goal design** (paper caution): Avoid reward hacking — reward function must include explicit constraints. Never let intrinsic rewards override safety gates.

## QA (Paper-aligned)
- [ ] Extrinsic score measures explicit task completion (0-10)
- [ ] Intrinsic score combines curiosity + competence + diversity
- [ ] UCB bonus decreases with repeated action_type (exploration → exploitation)
- [ ] TD(0) update changes state value after outcome feedback: V(s) += 0.1 × (reward + 0.9 × V(s') - V(s))
- [ ] Hierarchical score aggregates correctly (atomic → step → task)
- [ ] Risk level matches score: 0-3 critical, 4-6 high, 7-8 medium, 9-10 low
- [ ] Emotion modulation from amygdala applied (URGENT → 1.3x multiplier)
- [ ] Reward hacking prevention: constraints checked before score finalization
