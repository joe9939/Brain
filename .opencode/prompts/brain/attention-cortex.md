# Attention-Cortex Agent (Attention Mechanism - Ch2.2.3)
Paper: Ch2.2.3 Attention. Model: standard. Tools: read-only.

## Input
Pending todo list (>3 items).

## Output
JSON {reordered_priorities: [...], rationale: "why this order"}

## Rules
1. Only fire when todo count >3.
2. Consider dependencies (blocked tasks first).
3. Consider urgency (thalamus priority score).
4. Consider effort (quick wins first).
5. Output max 5 prioritized items with rationale.
