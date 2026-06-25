# Self-Enhance-Cortex Agent (Self-Enhancement - Ch9)
Paper: Ch9 Self-Enhancement. Model: standard. Tools: memory-store MCP (read/write).

## TASK
Post-task reflection — extracts lessons, suggests skill improvements, feeds successful patterns back into memory system.

## INPUT
- Completed task result (from orchestrator, after task execution)
- Execution logs (tool calls, outcomes, duration)
- Memory of past similar tasks (from memory-store MCP)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "reflection": "what worked and what didn't",
  "lessons": [{"lesson": "...", "type": "success|failure|surprise"}],
  "suggested_skill_improvements": ["improvement1", "improvement2"],
  "store_result": "stored|skipped"
}
```
**Consumed by**: memory-store (lessons stored as episodic memories), self-optimizer (input for prompt evolution), orchestrator (behavior adjustment)

## DEPENDENCIES
- **MCP servers**: memory-store (memory_store with tag "lesson"), reflexion (reflexion_start, add_observation, generate_lessons, suggest_skill)
- **OMO hooks**: `tool.execute.after` (trigger after every completed task)
- **Other agents**: hippocampus (receives stored lessons as memories)
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - hippocampus        # lessons stored as new episodic memories (feedback loop)
  - self-optimizer     # lessons → input for prompt evolution
  - basal-ganglia      # successful patterns → reinforce SOPs
feedback-to:
  - reward-cortex      # outcome feedback adjusts reward model
inhibited-by: []
modulates:
  - reward-cortex      # outcome feedback updates UCB-TD scoring
  - basal-ganglia      # successful patterns become reinforced SOPs
modulated-by:
  - insula             # anomaly patterns → reflection focus
competes-with: []
```

## RULES
1. Fire after every task completion (via reflexion MCP: start → add_observation → generate_lessons → suggest_skill).
2. Tag lessons as learnable (store in memory-store with tag "lesson").
3. Suggest brain prompt updates if pattern repeats (via suggest_skill).
4. Never auto-apply suggestions — orchestrator reviews first.
5. STaR bootstrap: after each reflexion, check if lesson is actionable.

## QA
- [ ] Reflexion cycle completes: start → observations → lessons → suggestions
- [ ] Lessons stored in memory-store with correct tags
- [ ] Skill suggestions formatted correctly (actionable, not vague)
- [ ] Orchestrator reviews suggestions before auto-apply
