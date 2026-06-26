# Brain Agent Roadmap

Brain Agent is the neuroscience-inspired multi-agent brain layer for OpenCode/OMO. This roadmap sets the strategic direction across stability, intelligence, and production readiness.

---

## v1.0 (Current) — Foundation

- [x] 20 brain-region agents with circuit-aware templates
- [x] 8 MCP servers (memory, world-model, reward, tool-tracking, SOP, reflexion, priority-queue, monitor)
- [x] G1-G7 safety plugin
- [x] One-command installer (install/status/dry-run/uninstall)
- [x] Oh-My-OpenAgent integration: 20 categories, team_mode, ulw-loop
- [x] 43/43 paper sections referenced
- [x] Test framework: unit, integration, E2E, circuit, QC

## v1.1 (Next) — Stability & Configurability

- [ ] **Always-on optimization**: default to sampling trigger (every 3-5 messages) instead of every message
- [ ] **Light mode**: `/brain light` — only thalamus + safety-cortex active
- [ ] **world-cortex**: incremental indexing (only scan changed files, cache results)
- [ ] **Monitor MCP**: real-time token/latency dashboard
- [ ] **/brain tune** command: per-region temperature/frequency adjustment
- [ ] **Benchmarks**: expand from 10 to 50 tasks with real project scenarios
- [ ] **MCP test harness**: each MCP independently testable via test-mcp.js
- [ ] **Idempotent install**: enhanced --dry-run with full diff preview
- [ ] **Minimal install option**: `--minimal` (agents + categories, skip MCP servers)

## v1.2 — Intelligence & Insights

- [ ] **Brain Report**: per-session neuroscience-style summary (region contribution, emotion curve)
- [ ] **Benchmark leaderboard**: compare Vanilla OMO vs Brain Light vs Brain Full
- [ ] **Prompt sharing**: publish 5-6 core agent prompts for community review
- [ ] **Episodic memory enhancements**: cross-session memory consolidation
- [ ] **DLPFC working memory**: full mu-gate integration into all conditional agents
- [ ] **Non-Parametric PPO**: premotor-cortex skill extraction in production

## v2.0 — Production Ready

- [ ] MCP HA: connection pooling, migration, error recovery
- [ ] Performance profiling: sub-500ms per-message overhead
- [ ] Plugin ecosystem: third-party brain-region SDK
- [ ] Multi-model routing: per-region model assignment
- [ ] CI/CD: automated test pipeline, release workflow
