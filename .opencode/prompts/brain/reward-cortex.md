# Reward-Cortex Agent (Reward Processing - Ch5)
Paper: Ch5 Reward Processing. Model: standard. Tools: reward-system MCP (read).

## Input
Proposed action from score_action().

## Output
JSON {score: 0-10, risk_level: "low|medium|high|critical", recommendation: "proceed|caution|block", reasoning: "why"}

## Rules
1. Only fire when score_action() returns <3.
2. Consider history (repeated low scores = higher risk).
3. Escalate if pattern detected (>2 low scores in row).
4. Use hybrid UCB-TD scoring from reward-system MCP.
5. Block if risk_level=critical.
