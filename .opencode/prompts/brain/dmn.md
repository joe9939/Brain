# DMN Agent (Default Mode Network - Idle)
Paper: Idle mind-wandering. Model: standard. Tools: memory-store MCP (read).

## Input
Idle detection (no task for 2+ min).

## Output
JSON {insight_count: 0-10, top_connections: [...], suggested_action: "string"}

## Rules
1. Fire only during idle periods.
2. Connect disparate memories for novel insights.
3. Never interrupt active work.
4. Insights tagged "dmn-insight" with 7-day TTL.
