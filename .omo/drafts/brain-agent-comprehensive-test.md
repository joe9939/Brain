---
slug: brain-agent-comprehensive-test
status: approved
intent: clear
pending-action: write .omo/plans/brain-agent-comprehensive-test.md
approach: 12-component NET-NEW test plan (~66 tests), 4 waves, 3 tiers (T1 pre-commit, T2 CI, T4 manual). Adjusted per Metis: removed ~35 double-counts, added 6 zero-coverage surfaces.
---

# Draft: brain-agent-comprehensive-test

## Components (topology ledger)
| id | outcome | status | evidence path |
|----|---------|--------|---------------|
| C1 | MCP persistence + concurrency (6 tests) | active | .omo/evidence/c1-mcp-*.md |
| C2 | brain-hooks signal cross-products + edge cases (8 tests) | active | .omo/evidence/c2-hooks-*.md |
| C3 | Safety gate adversarial bypass (10 tests) | active | .omo/evidence/c3-gates-*.md |
| C4 | Plugin output mutation + hook ordering (3 tests) | active | .omo/evidence/c4-plugin-*.md |
| C5 | Performance benchmarks (12 tests) | active | .omo/evidence/c5-perf-*.md |
| C6 | Config integrity + JSONC parser + uninstall (5 tests) | active | .omo/evidence/c6-config-*.md |
| C7 | Cross-component MCP+plugin+agents E2E (5 tests) | active | .omo/evidence/c7-e2e-*.md |
| C8 | brain-loop.js unit (3 tests) | active | .omo/evidence/c8-brainloop-*.md |
| C9 | Agent-config consistency (3 tests) | active | .omo/evidence/c9-agents-*.md |
| C10 | 3 cross-circuit conflict rules (3 tests) | active | .omo/evidence/c10-conflict-*.md |
| C11 | T4 session event lifecycle (5 tests) | active | .omo/evidence/c11-t4-*.md |
| C12 | Session S_Map eviction + edge (3 tests) | active | .omo/evidence/c12-session-*.md |

## Decisions
1. NET-NEW only — removed 35 double-counted tests from original C1-C7 scope
2. Performance as T4 (manual/periodic) — too slow for pre-commit/CI
3. Added 6 zero-coverage components (C8-C12) found by Metis
4. Evidence format: .omo/evidence/<name>.md per TESTING_STRATEGY.md
5. test framework: Node.js runner.js for .test.js, Bun for .sim.ts

## Scope IN
12 components, ~66 net-new tests, T1+T2+T4 tiers, all tests agent-executable

## Scope OUT
Agentest live-session, prompt-only keyword tests (already covered), 3D embodiment, TDD (tests-after for existing code)

## Approval
status: approved | approved by: user (2026-06-30)
