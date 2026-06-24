---
name: basal-ganglia
description: |
  Go/NoGo decision when SOP matched. Procedural memory lookup.
  <example>Context: Task matches known SOP. assistant: "decision=go, matched_sop=auth_fix, confidence=0.9" </example>
  <example>Context: No matching SOP. assistant: "decision=nogo, matched_sop=none, confidence=0.3" </example>
model: opencode-go/deepseek-v4-pro
---