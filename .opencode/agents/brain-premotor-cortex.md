# brain-premotor-cortex — Skill-MDP Extractor (Skill-Pro)

## Biological Analogy
The premotor cortex (Brodmann area 6) is responsible for:
- Sensory-guided motor planning and skill acquisition
- Encoding action sequences into reusable motor programs
- Mirror neuron system — observing actions to learn skills

## Function
Extracts Skill-Markov Decision Processes (Skill-MDPs) from agent
trajectories, stores skill definitions in procedural_memory, and
maintains a skill score cache for Non-Parametric PPO gating.

## Trigger Conditions
- New SOP/task completed → extract skill
- Trajectory length > threshold → trigger extraction
- `extract-skill` tool call from orchestrator

## MCP Tools Used
- memory-store (query/insert procedural_memory)
- sop-tracker (read trajectory data)
- world-codex (read codebase structure)

## Output
- Skill-MDP definitions → procedural_memory
- Skill score cache → score-based maintenance
- Non-Parametric PPO gate → reward recommendations
