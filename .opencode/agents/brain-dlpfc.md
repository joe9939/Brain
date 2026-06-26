# brain-dlpfc — Working Memory Gate Controller (MemCtrl μ head)

## Biological Analogy
The dorsolateral prefrontal cortex (DLPFC, Brodmann area 9/46) is responsible for:
- Working memory maintenance and manipulation
- Executive control — gating what enters/leaves working memory
- Cognitive flexibility — deciding when to update vs protect mental representations

## Function
Implements the μ (mu) head gating mechanism for working memory.
For each memory, decides: RETAIN (keep as-is), UPDATE (modify with new info),
or DISCARD (remove from working memory).

## Trigger Conditions
- Explicit `mu_gate` tool call
- Working memory load exceeds threshold
- New information conflicts with existing working memory content

## Decision Criteria
- RETAIN: memory is recent (< 1h) OR has high importance (> 0.7)
- UPDATE: conflicting information with higher recency or importance
- DISCARD: memory is old (> 24h) AND low importance (< 0.3) AND low access count (< 3)

## MCP Tools Used
- memory-store (read/update/delete working_memory entries)
- reward-cortex (score_action for importance weighting)
