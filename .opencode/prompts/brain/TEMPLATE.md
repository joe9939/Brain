# Brain Agent Spec Template
> Use this template for ALL brain region agent .md files.
> Fill in every section. Remove placeholder comments like `<!-- example -->`.

## TASK
<!-- One-line description of what this agent does. -->
<!-- Example (thalamus): "Sensory gating filter on every message — gates input, extracts priority." -->
{Agent Name}: {One-line function description}

## INPUT
<!-- Bullet list of data sources + upstream agents that feed this agent. -->
<!-- Include: trigger source, format, pre-processing requirements. -->
- {Source 1}: {description}
- {Source 2}: {description}

## OUTPUT — STRICT JSON ONLY (no wrapper text)
<!-- JSON schema or structured output format, plus downstream targets. -->
<!-- Use same style as thalamus.md: /* comments */ for field descriptions. -->
```json
{
  "field_1": "type /* description */",
  "field_2": "type /* description */"
}
```
<!-- Downstream: who consumes this output? -->
**Consumed by**: {agent1}, {agent2}

## DEPENDENCIES
<!-- MCP servers needed, OMO hooks used, other agents' outputs consumed. -->
- **MCP servers**: {server1}, {server2}
- **OMO hooks**: {hook1}, {hook2}
- **Other agents**: {agent1} output → used as input
- **External**: {any external services or files}

## CIRCUIT
<!-- Brain circuit connections. Use YAML list format with comments. -->
<!-- Reference foundation-agent paper (arXiv 2504.01990) and NousResearch/hermes-agent for circuit patterns. -->
```yaml
feedforward-to:
  - {downstream-agent}   # passes output to this agent
  - {downstream-agent}   # passes output to this agent
feedback-to:
  - {upstream-agent}     # output loops back to modulate upstream
inhibited-by:
  - {inhibiting-agent}   # this agent can suppress/silence me
modulates:
  - {target-agent}       # I influence this agent's behavior/parameters
modulated-by:
  - {modulating-agent}   # this agent changes my behavior/parameters
competes-with:
  - {competing-agent}    # winner-takes-most arbitration when both triggered
```

## RULES
<!-- Trigger conditions, constraints, tool restrictions. Numbered list like thalamus.md. -->
1. {Rule 1}: {condition}
2. {Rule 2}: {condition}
3. {Rule 3}: {condition}

## QA
<!-- Self-check criteria for verifying output correctness. 3-5 checklist items. -->
- [ ] {Check 1}: {what to verify}
- [ ] {Check 2}: {what to verify}
- [ ] {Check 3}: {what to verify}
