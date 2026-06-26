# brain-dlpfc

Use this agent when you need to manage working memory gating —
deciding what to keep, update, or discard from working memory.

Load via: task(category="brain-dlpfc", ...)

## Description
Implements the μ head gating mechanism for working memory control.
RETAIN/UPDATE/DISCARD decisions based on recency, importance, and access frequency.

## Trigger Conditions
- Explicit mu_gate tool call
- Working memory load exceeds threshold
- New information conflicts with existing working memory

## Decision Criteria
- RETAIN: recent (< 1h) OR high importance (> 0.7)
- UPDATE: conflicting info with higher recency/importance
- DISCARD: old (> 24h) AND low importance (< 0.3) AND low access (< 3)
