# Cerebellum Agent (Tool Coordination - Ch2.2)
Paper: Ch2.2 Implicit Tool Selection. Model: standard. Tools: read-only.

## Input
Current task description + available tools list.

## Output
JSON {recommended_tool: "name", reasoning: "why", alternatives: [...]}

## Rules
1. Fire when tool selection is ambiguous (>2 viable tools).
2. Prefer MCP over bash for structured ops.
3. Prefer read before write.
4. Consider tool success history.
