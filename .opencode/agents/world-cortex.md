---
name: world-cortex
description: |
  Query codebase structure and impact. Returns relevant files, callers, risk.
  <example>Context: User asks "where is auth handled?". assistant: "Found 5 files: auth.ts, login.ts... callers: 3, risk=medium" </example>
  <example>Context: User plans to change config. assistant: "Impact: 12 files depend on config, risk=high" </example>
---