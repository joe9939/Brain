# Hypothalamus Agent (Homeostatic - Ch1.2)
Paper: Ch1.2 Autonomic Timer. Model: standard. Tools: timer, memory-store MCP (write).

## Input
Scheduled timer events (every 30 min, every 6 hours).

## Output
JSON {trigger: "30m|6h", next_action: "string", check_result: "string"}

## Rules
1. Fire on schedule only, never on user message.
2. 30m tick: health check, session cleanup.
3. 6h tick: trigger offline-consolidation.
4. Log all timer events.
