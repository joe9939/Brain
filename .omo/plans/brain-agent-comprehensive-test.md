# brain-agent-comprehensive-test - Work Plan (V2 - 311 Tests)

## TL;DR (For humans)

**What you will get:** A comprehensive test suite delivering ~311 agent-executable tests across 15 components covering every surface of brain-agent: 8 MCP servers (50 tests), 7-signal competition engine (35 tests, all cross-products), 7 safety gates (35 tests, 5 bypass vectors each), plugin lifecycle (15 tests), performance baselines with stress testing (20 tests), configuration integrity (15 tests), cross-component E2E (15 tests), brain-loop.js hook engine (8 tests), agent-config consistency (10 tests), cross-circuit conflict rules (6 tests), T4 session lifecycle (10 tests), session management (8 tests), event hook completeness (8 tests), permission system (6 tests), OMO category resolution (5 tests), plugin SDK compatibility (4 tests), plugin conflict/order (4 tests), CLI install/uninstall/status (15 tests, FIRST — all later tests depend on proper installation), BrainTracer observability module (8 tests, embedded in brain-hooks.mjs — uses existing memory_store MCP for trace storage, zero new dependencies), RUNTIME SIMULATION (50 Agentest scenarios via expanded brain-mechanism handler), and SWE-bench Lite evaluation (50 tasks) as real coding benchmark.

**Why this approach:** CLI installation testing comes FIRST (Wave 0) because every other component depends on the brain agent being properly installed. After Metis audit identified 35 double-counts, the plan was rebuilt from zero targeting only genuinely uncovered surfaces. Tests mirror existing runner.js convention and write structured evidence to .omo/evidence/. Agentest scenarios use the expanded agentest-handler.mjs to record deterministic mechanism data (signals, gates, M_t state, hook order) for assertion — independent of LLM output content.

**What it will NOT do:** Modify existing test files, change production code, add new dependencies beyond existing Node.js/Bun/MCP SDK, re-test keyword-pattern coverage, test via live opencode desktop API.

**Effort:** Large (~311 tests across 7 waves)
**Risk:** Medium — scope size managed via parallel waves + component independence
**Decisions to sanity-check:** Agentest handler design, performance threshold values, SWE-bench pass@1 baseline

---

## Scope

### Must have
- 15 components (C1-C15), ~311 net-new test files
- CLI install/uninstall/status tests FIRST (W0) — gating all others
- All tests under tests/ directory following existing structure
- All evidence under .omo/evidence/ with structured PASS/FAIL format
- T1 (<1s) pre-commit: unit tests, config checks, CLI smoke, signal math, gate patterns
- T2 (<30s) CI: MCP persistence/concurrency, cross-component integration, Agentest scenarios
- T4 (manual): performance benchmarks, SWE-bench Lite, stress tests

### Must NOT have
- Must NOT modify existing test files — additive only
- Must NOT change runner.js behavior
- Must NOT add test dependencies beyond existing Node.js/Bun/MCP SDK
- Must NOT create production code — only tests
- Must NOT re-test already-covered surfaces (35 double-counts removed)
- Must NOT include agentest live-session via desktop API (handler does in-process)
- Must NOT change package.json scripts except adding test:perf

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + Node.js runner.js for .test.js, Agentest for .sim.ts scenarios
- Evidence: .omo/evidence/<task-id>-<descriptive-name>.md
- Evidence format: # Test: <name> | **Status**: PASS|FAIL | ## Checks: - [x] item

## Execution strategy

### 从基础到系统：7层架构

Layer 0 — Foundation (根基)     W0: C22 Tracer(8) + C15 CLI(15) + C19 SDK(4) + C6 Config(15) + C9 Agent(10) = 52 ← BrainTracer FIRST
Layer 1 — Plugin Engine (插件)   W1: C4 Hooks(15) + C20 Conflict(4) + C17 Permission(6) + C16 Cascade(10) = 35
Layer 2 — Core Signals (信号)    W2: C2 Signals(35) + C10 Rules(6) + C18 OMO(5) + C8 BrainLoop(8) = 54
Layer 3 — Safety & Services (安全) W3: C3 Gates(35) + C12 Session(8) + C11 T4(10) = 53
Layer 4 — MCP Data (数据)       W4: C1 MCP(50) + C21 DataFlow(20) = 70
Layer 5 — Integration (集成)     W5: C7 E2E(15) + C13 Agentest(50) = 65
Layer 6 — System (系统级)       W6: C14 SWEbench(6) + C5 Perf(20) + F1-F5(5) = 31
Total: 44+35+54+53+70+65+31 = **352 tests**

Each layer builds on the one below. Wave 0 must pass before Wave 1, etc.

### Parallelization within layers
Within each wave, tests can run in parallel (no cross-dependencies).
Between waves: strict sequential (each layer verified before next starts).

### Dependency matrix
| Layer | Wave | Components | Depends on | Blocks |
|-------|------|-----------|-----------|--------|
| 0 | W0 | C15+C19+C6+C9 | nothing | all below |
| 1 | W1 | C4+C20+C17+C16 | W0 | W2 |
| 2 | W2 | C2+C10+C18+C8 | W0, W1 (partial) | W3 |
| 3 | W3 | C3+C12+C11 | W2 | W4 |
| 4 | W4 | C1+C21 | W3, MCP dist/ built | W5 |
| 5 | W5 | C7+C13 | W4, OPENCODE_GO_API_KEY | W6 |
| 6 | W6 | C14+C5+F1-F5 | W5 | nothing |

## Todo
Total: 52 + 35 + 54 + 53 + 70 + 65 + 31 = **360 tests**

### Wave 0 — Layer 0: Foundation — CLI/SDK/Config/Agent (44 tests) — CLI install/uninstall (15) + agentest-handler (1) — must pass first

### Wave 0 — C22: BrainTracer observability module (8 tests) — built-in, used by all downstream tests

BrainTracer is an embedded observability module in brain-hooks.mjs. It records every hook event, signal competition winner, gate block, and M_t state change per message per session. Storage uses existing memory_store MCP (type:trace, key:trace:{session}:{msg_id}). Zero new dependencies.

All C7/C13/C16 tests depend on BrainTracer for circuit-level assertions.

- [x] 0.1 C22: BrainTracer core — append() records event correctly
  What: tests/tracer/core-append.test.js. Call BrainTracer.append(sid,mid,{event,ts,data}). Verify stored in internal buffer. Buffer capped at 1000 events.
  Accept: buffer has 1 entry matching input. Parallelization: W0 | Blocked: nothing
  Evidence: .omo/evidence/c22-core-append.md
  Commit: Y | feat(tracer): add core append

- [x] 0.2 C22: BrainTracer flush — buffer written to memory_store
  What: tests/tracer/core-flush.test.js. Append 5 events, call flush(sid,mid). Verify memory_store called with type:trace, key:trace:{sid}:{mid}, content matches 5 events.
  Accept: memory_store received correct payload. Evidence: .omo/evidence/c22-core-flush.md
  Commit: Y | feat(tracer): add flush to memory_store

- [x] 0.3 C22: BrainTracer query — export(sid) returns all events
  What: tests/tracer/query-export.test.js. 3 messages with events each. export(sid) returns concatenated array sorted by ts.
  Accept: 3 messages x 4 events = 12 events total. Evidence: .omo/evidence/c22-query-export.md
  Commit: Y | feat(tracer): add export query

- [x] 0.4 C22: BrainTracer filter — query({event:"SIGNAL"}) returns only signal events
  Accept: filtered array has only SIGNAL type events. Evidence: .omo/evidence/c22-query-filter.md
  Commit: Y | feat(tracer): add filtered query

- [x] 0.5 C22: BrainTracer integration — brain-hooks.mjs auto-records T1/T2/T3/T4
  What: tests/circuits/tracer-integration.test.js. Send message via MockSession. Verify tracer has: T3:message, SIGNAL, T1:before, T2:after events.
  Accept: trace contains all 4 event types in correct order.
  Evidence: .omo/evidence/c22-tracer-integration.md
  Commit: Y | feat(tracer): integrate into brain-hooks

- [x] 0.6 C22: BrainTracer G1 block recorded
  What: tests/tracer/gate-record.test.js. Send dangerous command. Verify tracer has T1:before with blocked:true. Verify no T2:after follows.
  Accept: G1 block recorded accurately. Evidence: .omo/evidence/c22-gate-record.md
  Commit: Y | feat(tracer): record gate blocks

- [x] 0.7 C22: BrainTracer M_t state snapshots in T2 events
  What: tests/tracer/state-snapshot.test.js. After each T2:after, verify trace entry includes M_emo, M_rew, version fields.
  Accept: each T2 entry has M_t snapshot. Evidence: .omo/evidence/c22-state-snapshot.md
  Commit: Y | feat(tracer): add M_t snapshots

- [x] 0.8 C22: BrainTracer performance — append under 0.1ms, buffer 10K events < 5MB
  What: tests/tracer/perf-bench.test.js. Benchmark append latency, buffer memory. 10K events must be < 5MB, append must be < 0.1ms.
  Accept: performance bounds met. Evidence: .omo/evidence/c22-perf-bench.md
  Commit: Y | perf(tracer): verify performance bounds


- [x] 0.0 Expand agentest-handler.mjs — full brain mechanism processor
  What: Rewrite tests/agentest-handler.mjs. Must export handler that calls onMessage(), simulates 5 L1 agents via onToolAfter(), calls getStrongestSignal(), tracks M_t across sessions, records mechanisms (signals/gates/mood/tools), handles G1-G7 patterns. Returns {mechanisms, response}. Pure in-process Node.js.
  Parallelization: W0 | Blocked: nothing | Blocks: C13 Agentest scenarios
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs, .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: node -e imports handler. QA: send hello returns {mechanisms, response}
  Evidence: .omo/evidence/c13a-handler-expansion.md
  Commit: Y | refactor(agentest): expand handler to full brain mechanism processor



### Wave 0 — C15: CLI install/uninstall/status (15 tests) — MUST PASS FIRST install/uninstall/status comprehensive (15 tests) — FIRST, everything depends on install

The install.js CLI is the user entry point. Must be comprehensively tested for argument parsing, error handling, idempotency, and all subcommands.

- [x] 3.46 C15: CLI help
  What: tests/unit/cli-help.test.js. install.js --help produces help text with all flags. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-help.md
  Commit: Y | test(unit): add CLI help test

- [x] 3.47 C15: CLI invalid-flag
  What: tests/unit/cli-invalid-flag.test.js. install.js --invalid-flag exits non-zero + error. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-invalid-flag.md
  Commit: Y | test(unit): add CLI invalid-flag test

- [x] 3.48 C15: CLI no-args
  What: tests/unit/cli-no-args.test.js. install.js with no args shows usage/help. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-no-args.md
  Commit: Y | test(unit): add CLI no-args test

- [x] 3.49 C15: CLI version
  What: tests/unit/cli-version.test.js. install.js --version prints version string. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-version.md
  Commit: Y | test(unit): add CLI version test

- [x] 3.50 C15: CLI status-not-installed
  What: tests/unit/cli-status-not-installed.test.js. install.js --status when not installed reports not-installed. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-status-not-installed.md
  Commit: Y | test(unit): add CLI status-not-installed test

- [x] 3.51 C15: CLI status-installed
  What: tests/unit/cli-status-installed.test.js. install.js --status when installed reports version+paths. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-status-installed.md
  Commit: Y | test(unit): add CLI status-installed test

- [x] 3.52 C15: CLI dry-run-files
  What: tests/unit/cli-dry-run-files.test.js. install.js --dry-run: no files created, no paths modified. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-dry-run-files.md
  Commit: Y | test(unit): add CLI dry-run-files test

- [x] 3.53 C15: CLI dry-run-output
  What: tests/unit/cli-dry-run-output.test.js. install.js --dry-run: stdout shows what WOULD happen. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-dry-run-output.md
  Commit: Y | test(unit): add CLI dry-run-output test

- [x] 3.54 C15: CLI fresh-install
  What: tests/unit/cli-fresh-install.test.js. install.js: plugins copied, MCP linked, config updated. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-fresh-install.md
  Commit: Y | test(unit): add CLI fresh-install test

- [x] 3.55 C15: CLI reinstall
  What: tests/unit/cli-reinstall.test.js. install.js when already installed: idempotent, no duplicates. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-reinstall.md
  Commit: Y | test(unit): add CLI reinstall test

- [x] 3.56 C15: CLI uninstall-not-installed
  What: tests/unit/cli-uninstall-not-installed.test.js. install.js --uninstall when not installed: exits 0. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-uninstall-not-installed.md
  Commit: Y | test(unit): add CLI uninstall-not-installed test

- [x] 3.57 C15: CLI uninstall-clean
  What: tests/unit/cli-uninstall-clean.test.js. install.js --uninstall after install: all traces removed. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-uninstall-clean.md
  Commit: Y | test(unit): add CLI uninstall-clean test

- [x] 3.58 C15: CLI uninstall-twice
  What: tests/unit/cli-uninstall-twice.test.js. install.js --uninstall twice: second succeeds too. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-uninstall-twice.md
  Commit: Y | test(unit): add CLI uninstall-twice test

- [x] 3.59 C15: CLI uninstall-backup
  What: tests/unit/cli-uninstall-backup.test.js. install.js --uninstall: backup files created before removal. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-uninstall-backup.md
  Commit: Y | test(unit): add CLI uninstall-backup test

- [x] 3.60 C15: CLI env-check
  What: tests/unit/cli-env-check.test.js. install.js with unsupported Node version: graceful handling. Must use temp sandbox, not production config.
  Parallelization: W3 | Blocked: nothing | Blocks: nothing
  Refs: install.js:1-576
  Accept: node test passed:true
  QA: Happy — correct exit/output. Failure — wrong behavior
  Evidence: .omo/evidence/c15-cli-env-check.md
  Commit: Y | test(unit): add CLI env-check test



### Wave 2 — C3: Safety gates bypass continuation (25 tests) (25) + brain-loop (8) + Agent-Config (10) + Conflict (2)

- [x] 2.1 C3-p2: G3 bypass 1 — sensitive-file-variants
  What: tests/unit/g3-bypass-1.test.js. Test G3 regex against sensitive-file-variants.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:39-51
  Accept: 3+ bypasses detected. QA: Happy — detected. Failure — passes
  Evidence: .omo/evidence/c3-g3-bypass-1.md
  Commit: Y | test(unit): add G3 bypass 1

- [x] 2.2 C3-p2: G3 bypass 2 — path-traversal-variants
  What: tests/unit/g3-bypass-2.test.js. Test G3 regex against path-traversal-variants.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:39-51
  Accept: 3+ bypasses detected. QA: Happy — detected. Failure — passes
  Evidence: .omo/evidence/c3-g3-bypass-2.md
  Commit: Y | test(unit): add G3 bypass 2

- [x] 2.3 C3-p2: G3 bypass 3 — case-variants-ENV
  What: tests/unit/g3-bypass-3.test.js. Test G3 regex against case-variants-ENV.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:39-51
  Accept: 3+ bypasses detected. QA: Happy — detected. Failure — passes
  Evidence: .omo/evidence/c3-g3-bypass-3.md
  Commit: Y | test(unit): add G3 bypass 3

- [x] 2.4 C3-p2: G3 bypass 4 — unicode-injection
  What: tests/unit/g3-bypass-4.test.js. Test G3 regex against unicode-injection.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:39-51
  Accept: 3+ bypasses detected. QA: Happy — detected. Failure — passes
  Evidence: .omo/evidence/c3-g3-bypass-4.md
  Commit: Y | test(unit): add G3 bypass 4

- [x] 2.5 C3-p2: G3 bypass 5 — multi-line-injection
  What: tests/unit/g3-bypass-5.test.js. Test G3 regex against multi-line-injection.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:39-51
  Accept: 3+ bypasses detected. QA: Happy — detected. Failure — passes
  Evidence: .omo/evidence/c3-g3-bypass-5.md
  Commit: Y | test(unit): add G3 bypass 5

- [x] 2.6 C3-p2: G4 bypass 1 — fetch-axios-calls
  What: tests/unit/g4-bypass-1.test.js. Test G4 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:54-58
  Accept: 3+ egress patterns detected. QA: Happy — fetch detected
  Evidence: .omo/evidence/c3-g4-bypass-1.md
  Commit: Y | test(unit): add G4 bypass 1

- [x] 2.7 C3-p2: G4 bypass 2 — dns-nslookup-dig
  What: tests/unit/g4-bypass-2.test.js. Test G4 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:54-58
  Accept: 3+ egress patterns detected. QA: Happy — fetch detected
  Evidence: .omo/evidence/c3-g4-bypass-2.md
  Commit: Y | test(unit): add G4 bypass 2

- [x] 2.8 C3-p2: G4 bypass 3 — websocket
  What: tests/unit/g4-bypass-3.test.js. Test G4 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:54-58
  Accept: 3+ egress patterns detected. QA: Happy — fetch detected
  Evidence: .omo/evidence/c3-g4-bypass-3.md
  Commit: Y | test(unit): add G4 bypass 3

- [x] 2.9 C3-p2: G4 bypass 4 — nc-reverse-shell
  What: tests/unit/g4-bypass-4.test.js. Test G4 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:54-58
  Accept: 3+ egress patterns detected. QA: Happy — fetch detected
  Evidence: .omo/evidence/c3-g4-bypass-4.md
  Commit: Y | test(unit): add G4 bypass 4

- [x] 2.10 C3-p2: G4 bypass 5 — pipe-egress-variants
  What: tests/unit/g4-bypass-5.test.js. Test G4 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:54-58
  Accept: 3+ egress patterns detected. QA: Happy — fetch detected
  Evidence: .omo/evidence/c3-g4-bypass-5.md
  Commit: Y | test(unit): add G4 bypass 5

- [x] 2.11 C3-p2: G5 bypass 1 — session-reset
  What: tests/unit/g5-bypass-1.test.js. Test G5 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:61-64
  Accept: 3+ injections blocked+logged. QA: Happy — blocked
  Evidence: .omo/evidence/c3-g5-bypass-1.md
  Commit: Y | test(unit): add G5 bypass 1

- [x] 2.12 C3-p2: G5 bypass 2 — goal-override
  What: tests/unit/g5-bypass-2.test.js. Test G5 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:61-64
  Accept: 3+ injections blocked+logged. QA: Happy — blocked
  Evidence: .omo/evidence/c3-g5-bypass-2.md
  Commit: Y | test(unit): add G5 bypass 2

- [x] 2.13 C3-p2: G5 bypass 3 — role-playing
  What: tests/unit/g5-bypass-3.test.js. Test G5 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:61-64
  Accept: 3+ injections blocked+logged. QA: Happy — blocked
  Evidence: .omo/evidence/c3-g5-bypass-3.md
  Commit: Y | test(unit): add G5 bypass 3

- [x] 2.14 C3-p2: G5 bypass 4 — system-prompt-override
  What: tests/unit/g5-bypass-4.test.js. Test G5 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:61-64
  Accept: 3+ injections blocked+logged. QA: Happy — blocked
  Evidence: .omo/evidence/c3-g5-bypass-4.md
  Commit: Y | test(unit): add G5 bypass 4

- [x] 2.15 C3-p2: G5 bypass 5 — combined-injection
  What: tests/unit/g5-bypass-5.test.js. Test G5 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:61-64
  Accept: 3+ injections blocked+logged. QA: Happy — blocked
  Evidence: .omo/evidence/c3-g5-bypass-5.md
  Commit: Y | test(unit): add G5 bypass 5

- [x] 2.16 C3-p2: G6 bypass 1 — force-push-variants
  What: tests/unit/g6-bypass-1.test.js. Test G6 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:67-71
  Accept: 3+ violations warned. QA: Happy — force push warned
  Evidence: .omo/evidence/c3-g6-bypass-1.md
  Commit: Y | test(unit): add G6 bypass 1

- [x] 2.17 C3-p2: G6 bypass 2 — mass-delete-variants
  What: tests/unit/g6-bypass-2.test.js. Test G6 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:67-71
  Accept: 3+ violations warned. QA: Happy — force push warned
  Evidence: .omo/evidence/c3-g6-bypass-2.md
  Commit: Y | test(unit): add G6 bypass 2

- [x] 2.18 C3-p2: G6 bypass 3 — git-discard-variants
  What: tests/unit/g6-bypass-3.test.js. Test G6 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:67-71
  Accept: 3+ violations warned. QA: Happy — force push warned
  Evidence: .omo/evidence/c3-g6-bypass-3.md
  Commit: Y | test(unit): add G6 bypass 3

- [x] 2.19 C3-p2: G6 bypass 4 — config-tamper-variants
  What: tests/unit/g6-bypass-4.test.js. Test G6 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:67-71
  Accept: 3+ violations warned. QA: Happy — force push warned
  Evidence: .omo/evidence/c3-g6-bypass-4.md
  Commit: Y | test(unit): add G6 bypass 4

- [x] 2.20 C3-p2: G6 bypass 5 — combined-destructive
  What: tests/unit/g6-bypass-5.test.js. Test G6 regex.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:67-71
  Accept: 3+ violations warned. QA: Happy — force push warned
  Evidence: .omo/evidence/c3-g6-bypass-5.md
  Commit: Y | test(unit): add G6 bypass 5

- [x] 2.21 C3-p2: G7 audit 1 — all-tools-logged
  What: tests/unit/g7-audit-1.test.js. Test G7 audit logging.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:16-21, :93
  Accept: node test passed:true. QA: Happy — 100 calls = 100 JSON lines
  Evidence: .omo/evidence/c3-g7-audit-1.md
  Commit: Y | test(unit): add G7 audit 1

- [x] 2.22 C3-p2: G7 audit 2 — log-file-rotation
  What: tests/unit/g7-audit-2.test.js. Test G7 audit logging.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:16-21, :93
  Accept: node test passed:true. QA: Happy — 100 calls = 100 JSON lines
  Evidence: .omo/evidence/c3-g7-audit-2.md
  Commit: Y | test(unit): add G7 audit 2

- [x] 2.23 C3-p2: G7 audit 3 — parseable-JSON
  What: tests/unit/g7-audit-3.test.js. Test G7 audit logging.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:16-21, :93
  Accept: node test passed:true. QA: Happy — 100 calls = 100 JSON lines
  Evidence: .omo/evidence/c3-g7-audit-3.md
  Commit: Y | test(unit): add G7 audit 3

- [x] 2.24 C3-p2: G7 audit 4 — timestamps-correct
  What: tests/unit/g7-audit-4.test.js. Test G7 audit logging.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:16-21, :93
  Accept: node test passed:true. QA: Happy — 100 calls = 100 JSON lines
  Evidence: .omo/evidence/c3-g7-audit-4.md
  Commit: Y | test(unit): add G7 audit 4

- [x] 2.25 C3-p2: G7 audit 5 — perf-100-calls
  What: tests/unit/g7-audit-5.test.js. Test G7 audit logging.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:16-21, :93
  Accept: node test passed:true. QA: Happy — 100 calls = 100 JSON lines
  Evidence: .omo/evidence/c3-g7-audit-5.md
  Commit: Y | test(unit): add G7 audit 5

- [x] 2.26 C8: brain-loop test 1 — stdin-parse
  What: tests/unit/brain-loop-1.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-1.md
  Commit: Y | test(unit): add brain-loop 1

- [x] 2.27 C8: brain-loop test 2 — all-tool-injections
  What: tests/unit/brain-loop-2.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-2.md
  Commit: Y | test(unit): add brain-loop 2

- [x] 2.28 C8: brain-loop test 3 — user-message-branch
  What: tests/unit/brain-loop-3.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-3.md
  Commit: Y | test(unit): add brain-loop 3

- [x] 2.29 C8: brain-loop test 4 — debounce-same-injection
  What: tests/unit/brain-loop-4.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-4.md
  Commit: Y | test(unit): add brain-loop 4

- [x] 2.30 C8: brain-loop test 5 — debounce-different-fires
  What: tests/unit/brain-loop-5.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-5.md
  Commit: Y | test(unit): add brain-loop 5

- [x] 2.31 C8: brain-loop test 6 — state-file-persistence
  What: tests/unit/brain-loop-6.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-6.md
  Commit: Y | test(unit): add brain-loop 6

- [x] 2.32 C8: brain-loop test 7 — unknown-tool-graceful
  What: tests/unit/brain-loop-7.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-7.md
  Commit: Y | test(unit): add brain-loop 7

- [x] 2.33 C8: brain-loop test 8 — invalid-JSON-handling
  What: tests/unit/brain-loop-8.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: hooks/brain-loop.js:1-78
  Accept: node test passed:true. QA: Happy — valid JSON shows BRAIN
  Evidence: .omo/evidence/c8-brain-loop-8.md
  Commit: Y | test(unit): add brain-loop 8

- [x] 2.34 C9: Agent-config 1 — category-agent-match
  What: tests/unit/agent-config-1.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-1.md
  Commit: Y | test(unit): add agent-config 1

- [x] 2.35 C9: Agent-config 2 — model-desc-perm-present
  What: tests/unit/agent-config-2.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-2.md
  Commit: Y | test(unit): add agent-config 2

- [x] 2.36 C9: Agent-config 3 — team-mode-valid
  What: tests/unit/agent-config-3.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-3.md
  Commit: Y | test(unit): add agent-config 3

- [x] 2.37 C9: Agent-config 4 — brain-master-refs-match-OMO
  What: tests/unit/agent-config-4.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-4.md
  Commit: Y | test(unit): add agent-config 4

- [x] 2.38 C9: Agent-config 5 — 5-skill-files-exist
  What: tests/unit/agent-config-5.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-5.md
  Commit: Y | test(unit): add agent-config 5

- [x] 2.39 C9: Agent-config 6 — desc-length-consistent
  What: tests/unit/agent-config-6.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-6.md
  Commit: Y | test(unit): add agent-config 6

- [x] 2.40 C9: Agent-config 7 — no-duplicate-definitions
  What: tests/unit/agent-config-7.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-7.md
  Commit: Y | test(unit): add agent-config 7

- [x] 2.41 C9: Agent-config 8 — perms-valid-allow-deny
  What: tests/unit/agent-config-8.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-8.md
  Commit: Y | test(unit): add agent-config 8

- [x] 2.42 C9: Agent-config 9 — models-reference-valid-provider
  What: tests/unit/agent-config-9.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-9.md
  Commit: Y | test(unit): add agent-config 9

- [x] 2.43 C9: Agent-config 10 — JSON-valid-against-schema
  What: tests/unit/agent-config-10.test.js.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true. QA: Happy — all 20 matched
  Evidence: .omo/evidence/c9-agent-10.md
  Commit: Y | test(unit): add agent-config 10

- [x] 2.44 C10-p1: Conflict rule D-K-reward-cap-formula
  What: tests/circuits/conflict-dk.test.js. Grep brain-master.md for rule text.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true. QA: Happy — rule found
  Evidence: .omo/evidence/c10-conflict-dk.md
  Commit: Y | test(circuits): add conflict rule 1

- [x] 2.45 C10-p1: Conflict rule B-J-CAUTION-freezes-DMN-traits
  What: tests/circuits/conflict-bj.test.js. Grep brain-master.md for rule text.
  Parallelization: W2 | Blocked: nothing | Blocks: W3
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true. QA: Happy — rule found
  Evidence: .omo/evidence/c10-conflict-bj.md
  Commit: Y | test(circuits): add conflict rule 2


### Wave 1 — C16+C17: Plugin Cascade + Permission (16 tests): OpenCode/OMO integration tests (23 tests)

Discovered from opencode/OMO GitHub source: missing event hook coverage, permission system, category resolution, and SDK compatibility.

C16: OpenCode event hook completeness — verify brain-plugin does not conflict with unused hooks (8 tests)

- [x] 2.46 C16: Event hook session.created — no conflict
  What: tests/plugin/hook-session-created.test.js. Simulate opencode firing session.created on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-created.md
  Commit: Y | test(plugin): add hook session.created test

- [x] 2.47 C16: Event hook session.compacted — no conflict
  What: tests/plugin/hook-session-compacted.test.js. Simulate opencode firing session.compacted on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-compacted.md
  Commit: Y | test(plugin): add hook session.compacted test

- [x] 2.48 C16: Event hook session.deleted — no conflict
  What: tests/plugin/hook-session-deleted.test.js. Simulate opencode firing session.deleted on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-deleted.md
  Commit: Y | test(plugin): add hook session.deleted test

- [x] 2.49 C16: Event hook session.diff — no conflict
  What: tests/plugin/hook-session-diff.test.js. Simulate opencode firing session.diff on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-diff.md
  Commit: Y | test(plugin): add hook session.diff test

- [x] 2.50 C16: Event hook session.status — no conflict
  What: tests/plugin/hook-session-status.test.js. Simulate opencode firing session.status on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-status.md
  Commit: Y | test(plugin): add hook session.status test

- [x] 2.51 C16: Event hook session.updated — no conflict
  What: tests/plugin/hook-session-updated.test.js. Simulate opencode firing session.updated on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-session-updated.md
  Commit: Y | test(plugin): add hook session.updated test

- [x] 2.52 C16: Event hook permission.asked — no conflict
  What: tests/plugin/hook-permission-asked.test.js. Simulate opencode firing permission.asked on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-permission-asked.md
  Commit: Y | test(plugin): add hook permission.asked test

- [x] 2.53 C16: Event hook permission.replied — no conflict
  What: tests/plugin/hook-permission-replied.test.js. Simulate opencode firing permission.replied on brain-plugin. Verify no crash, no error, no unexpected output mutation.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode plugin SDK docs, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — no-op gracefully. Failure — throws
  Evidence: .omo/evidence/c16-hook-permission-replied.md
  Commit: Y | test(plugin): add hook permission.replied test

- [x] 2.54 C17: Permission allow-wildcard
  What: tests/unit/permission-allow-wildcard.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-allow-wildcard.md
  Commit: Y | test(unit): add permission allow-wildcard test

- [x] 2.55 C17: Permission deny-tool
  What: tests/unit/permission-deny-tool.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-deny-tool.md
  Commit: Y | test(unit): add permission deny-tool test

- [x] 2.56 C17: Permission ask-permission
  What: tests/unit/permission-ask-permission.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-ask-permission.md
  Commit: Y | test(unit): add permission ask-permission test

- [x] 2.57 C17: Permission mixed-rules
  What: tests/unit/permission-mixed-rules.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-mixed-rules.md
  Commit: Y | test(unit): add permission mixed-rules test

- [x] 2.58 C17: Permission external-dir
  What: tests/unit/permission-external-dir.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-external-dir.md
  Commit: Y | test(unit): add permission external-dir test

- [x] 2.59 C17: Permission nested-path
  What: tests/unit/permission-nested-path.test.js. Parse opencode.json permission rules. Verify rule matching logic.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: opencode permission system docs, opencode.json:269-276
  Accept: node test passed:true
  QA: Happy — allow wildcard matches. Failure — rule not applied
  Evidence: .omo/evidence/c17-permission-nested-path.md
  Commit: Y | test(unit): add permission nested-path test

- [x] 2.60 C18: OMO category category-exists
  What: tests/unit/omo-category-category-exists.test.js. Verify OMO category resolution logic matches oh-my-openagent.jsonc.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: OMO category-resolver.ts, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — category resolves. Failure — error or wrong model
  Evidence: .omo/evidence/c18-omo-category-exists.md
  Commit: Y | test(unit): add OMO category category-exists test

- [x] 2.61 C18: OMO category category-resolves-model
  What: tests/unit/omo-category-category-resolves-model.test.js. Verify OMO category resolution logic matches oh-my-openagent.jsonc.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: OMO category-resolver.ts, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — category resolves. Failure — error or wrong model
  Evidence: .omo/evidence/c18-omo-category-resolves-model.md
  Commit: Y | test(unit): add OMO category category-resolves-model test

- [x] 2.62 C18: OMO category category-invalid-returns-error
  What: tests/unit/omo-category-category-invalid-returns-error.test.js. Verify OMO category resolution logic matches oh-my-openagent.jsonc.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: OMO category-resolver.ts, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — category resolves. Failure — error or wrong model
  Evidence: .omo/evidence/c18-omo-category-invalid-returns-error.md
  Commit: Y | test(unit): add OMO category category-invalid-returns-error test

- [x] 2.63 C18: OMO category category-brain-thalamus-resolves
  What: tests/unit/omo-category-category-brain-thalamus-resolves.test.js. Verify OMO category resolution logic matches oh-my-openagent.jsonc.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: OMO category-resolver.ts, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — category resolves. Failure — error or wrong model
  Evidence: .omo/evidence/c18-omo-category-brain-thalamus-resolves.md
  Commit: Y | test(unit): add OMO category category-brain-thalamus-resolves test

- [x] 2.64 C18: OMO category all-20-categories-resolve
  What: tests/unit/omo-category-all-20-categories-resolve.test.js. Verify OMO category resolution logic matches oh-my-openagent.jsonc.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: OMO category-resolver.ts, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — category resolves. Failure — error or wrong model
  Evidence: .omo/evidence/c18-omo-all-20-categories-resolve.md
  Commit: Y | test(unit): add OMO category all-20-categories-resolve test

- [x] 2.65 C19: Plugin SDK plugin-export-signature
  What: tests/plugin/sdk-plugin-export-signature.test.js. Verify brain-plugin.mjs function signature matches @opencode-ai/plugin types.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: @opencode-ai/plugin SDK types, src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true
  QA: Happy — signatures match. Failure — mismatch
  Evidence: .omo/evidence/c19-sdk-plugin-export-signature.md
  Commit: Y | test(plugin): add SDK plugin-export-signature test

- [x] 2.66 C19: Plugin SDK hook-signature-tool-before
  What: tests/plugin/sdk-hook-signature-tool-before.test.js. Verify brain-plugin.mjs function signature matches @opencode-ai/plugin types.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: @opencode-ai/plugin SDK types, src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true
  QA: Happy — signatures match. Failure — mismatch
  Evidence: .omo/evidence/c19-sdk-hook-signature-tool-before.md
  Commit: Y | test(plugin): add SDK hook-signature-tool-before test

- [x] 2.67 C19: Plugin SDK hook-signature-chat-message
  What: tests/plugin/sdk-hook-signature-chat-message.test.js. Verify brain-plugin.mjs function signature matches @opencode-ai/plugin types.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: @opencode-ai/plugin SDK types, src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true
  QA: Happy — signatures match. Failure — mismatch
  Evidence: .omo/evidence/c19-sdk-hook-signature-chat-message.md
  Commit: Y | test(plugin): add SDK hook-signature-chat-message test

- [x] 2.68 C19: Plugin SDK hook-signature-session-event
  What: tests/plugin/sdk-hook-signature-session-event.test.js. Verify brain-plugin.mjs function signature matches @opencode-ai/plugin types.
  Parallelization: W2 | Blocked: nothing | Blocks: nothing
  Refs: @opencode-ai/plugin SDK types, src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true
  QA: Happy — signatures match. Failure — mismatch
  Evidence: .omo/evidence/c19-sdk-hook-signature-session-event.md
  Commit: Y | test(plugin): add SDK hook-signature-session-event test



- [x] 3.1 C4: Plugin test 1 — T1-fires-on-every-exec-before
  What: tests/plugin/plugin-1.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-1.md
  Commit: Y | test(plugin): add plugin test 1

- [x] 3.2 C4: Plugin test 2 — T2-fires-on-every-exec-after
  What: tests/plugin/plugin-2.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-2.md
  Commit: Y | test(plugin): add plugin test 2

- [x] 3.3 C4: Plugin test 3 — T3-fires-on-chat-message
  What: tests/plugin/plugin-3.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-3.md
  Commit: Y | test(plugin): add plugin test 3

- [x] 3.4 C4: Plugin test 4 — T4-fires-on-session-event
  What: tests/plugin/plugin-4.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-4.md
  Commit: Y | test(plugin): add plugin test 4

- [x] 3.5 C4: Plugin test 5 — T1-T2-order-per-tool
  What: tests/plugin/plugin-5.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-5.md
  Commit: Y | test(plugin): add plugin test 5

- [x] 3.6 C4: Plugin test 6 — output-messages-mutated
  What: tests/plugin/plugin-6.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-6.md
  Commit: Y | test(plugin): add plugin test 6

- [x] 3.7 C4: Plugin test 7 — G1-G3-G5-throw-before-output
  What: tests/plugin/plugin-7.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-7.md
  Commit: Y | test(plugin): add plugin test 7

- [x] 3.8 C4: Plugin test 8 — G2-G4-G6-append-SAFETY-GATES
  What: tests/plugin/plugin-8.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-8.md
  Commit: Y | test(plugin): add plugin test 8

- [x] 3.9 C4: Plugin test 9 — audit-writes-to-file
  What: tests/plugin/plugin-9.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-9.md
  Commit: Y | test(plugin): add plugin test 9

- [x] 3.10 C4: Plugin test 10 — warnLog-writes-to-file
  What: tests/plugin/plugin-10.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-10.md
  Commit: Y | test(plugin): add plugin test 10

- [x] 3.11 C4: Plugin test 11 — G7-audits-every-tool
  What: tests/plugin/plugin-11.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-11.md
  Commit: Y | test(plugin): add plugin test 11

- [x] 3.12 C4: Plugin test 12 — T1-errors-caught-logged
  What: tests/plugin/plugin-12.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-12.md
  Commit: Y | test(plugin): add plugin test 12

- [x] 3.13 C4: Plugin test 13 — T2-errors-caught-logged
  What: tests/plugin/plugin-13.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-13.md
  Commit: Y | test(plugin): add plugin test 13

- [x] 3.14 C4: Plugin test 14 — T3-errors-caught-logged
  What: tests/plugin/plugin-14.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-14.md
  Commit: Y | test(plugin): add plugin test 14

- [x] 3.15 C4: Plugin test 15 — T4-errors-caught-logged
  What: tests/plugin/plugin-15.test.js.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: node test passed:true. QA: Happy — 10 calls = 10 audit
  Evidence: .omo/evidence/c4-plugin-15.md
  Commit: Y | test(plugin): add plugin test 15

- [x] 3.16 C6: Config test 16 — config-valid-JSON
  What: tests/unit/config-1.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-1.md
  Commit: Y | test(unit): add config test 1

- [x] 3.17 C6: Config test 17 — agent-paths-exist
  What: tests/unit/config-2.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-2.md
  Commit: Y | test(unit): add config test 2

- [x] 3.18 C6: Config test 18 — MCP-dist-exist
  What: tests/unit/config-3.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-3.md
  Commit: Y | test(unit): add config test 3

- [x] 3.19 C6: Config test 19 — plugin-paths-exist
  What: tests/unit/config-4.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-4.md
  Commit: Y | test(unit): add config test 4

- [x] 3.20 C6: Config test 20 — instructions-exist
  What: tests/unit/config-5.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-5.md
  Commit: Y | test(unit): add config test 5

- [x] 3.21 C6: Config test 21 — JSONC-single-line
  What: tests/unit/config-6.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-6.md
  Commit: Y | test(unit): add config test 6

- [x] 3.22 C6: Config test 22 — JSONC-multi-line
  What: tests/unit/config-7.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-7.md
  Commit: Y | test(unit): add config test 7

- [x] 3.23 C6: Config test 23 — JSONC-URL-preserve
  What: tests/unit/config-8.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-8.md
  Commit: Y | test(unit): add config test 8

- [x] 3.24 C6: Config test 24 — JSONC-trailing-comma
  What: tests/unit/config-9.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-9.md
  Commit: Y | test(unit): add config test 9

- [x] 3.25 C6: Config test 25 — JSONC-nested
  What: tests/unit/config-10.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-10.md
  Commit: Y | test(unit): add config test 10

- [x] 3.26 C6: Config test 26 — JSONC-string-preserved
  What: tests/unit/config-11.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-11.md
  Commit: Y | test(unit): add config test 11

- [x] 3.27 C6: Config test 27 — install-uninstall
  What: tests/unit/config-12.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-12.md
  Commit: Y | test(unit): add config test 12

- [x] 3.28 C6: Config test 28 — install-dry-run
  What: tests/unit/config-13.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-13.md
  Commit: Y | test(unit): add config test 13

- [x] 3.29 C6: Config test 29 — install-status
  What: tests/unit/config-14.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-14.md
  Commit: Y | test(unit): add config test 14

- [x] 3.30 C6: Config test 30 — OMO-20-categories-valid
  What: tests/unit/config-15.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: install.js:34-66, opencode.json, oh-my-openagent.jsonc
  Accept: node test passed:true
  QA: Happy — JSONC preserves URL. Failure — edge case fails
  Evidence: .omo/evidence/c6-config-15.md
  Commit: Y | test(unit): add config test 15

- [x] 3.31 C10-p2: Conflict rule active 1 — H-I-clamp-formula
  What: tests/circuits/conflict-active-1.test.js. Verify rule enforced.
  Parallelization: W3 | Blocked: W2 | Blocks: W5
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true
  QA: Happy — rule enforced. Failure — not applied
  Evidence: .omo/evidence/c10-conflict-active-1.md
  Commit: Y | test(circuits): add active conflict 1

- [x] 3.32 C10-p2: Conflict rule active 2 — D-K-enforced-in-M-t
  What: tests/circuits/conflict-active-2.test.js. Verify rule enforced.
  Parallelization: W3 | Blocked: W2 | Blocks: W5
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true
  QA: Happy — rule enforced. Failure — not applied
  Evidence: .omo/evidence/c10-conflict-active-2.md
  Commit: Y | test(circuits): add active conflict 2

- [x] 3.33 C10-p2: Conflict rule active 3 — B-J-CAUTION-prevents-drift
  What: tests/circuits/conflict-active-3.test.js. Verify rule enforced.
  Parallelization: W3 | Blocked: W2 | Blocks: W5
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true
  QA: Happy — rule enforced. Failure — not applied
  Evidence: .omo/evidence/c10-conflict-active-3.md
  Commit: Y | test(circuits): add active conflict 3

- [x] 3.34 C10-p2: Conflict rule active 4 — all-3-rules-simultaneous
  What: tests/circuits/conflict-active-4.test.js. Verify rule enforced.
  Parallelization: W3 | Blocked: W2 | Blocks: W5
  Refs: .opencode/skills/brain-master.md:93-96
  Accept: node test passed:true
  QA: Happy — rule enforced. Failure — not applied
  Evidence: .omo/evidence/c10-conflict-active-4.md
  Commit: Y | test(circuits): add active conflict 4

- [x] 3.35 C11: T4 event test 1 — error-triggers-homeostasis
  What: tests/plugin/t4-1.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-1.md
  Commit: Y | test(plugin): add T4 test 1

- [x] 3.36 C11: T4 event test 2 — idle-2min-triggers-DMN
  What: tests/plugin/t4-2.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-2.md
  Commit: Y | test(plugin): add T4 test 2

- [x] 3.37 C11: T4 event test 3 — idle-30min-triggers-health
  What: tests/plugin/t4-3.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-3.md
  Commit: Y | test(plugin): add T4 test 3

- [x] 3.38 C11: T4 event test 4 — idle-6h-triggers-consolidation
  What: tests/plugin/t4-4.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-4.md
  Commit: Y | test(plugin): add T4 test 4

- [x] 3.39 C11: T4 event test 5 — error-idle-error-seq-no-collision
  What: tests/plugin/t4-5.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-5.md
  Commit: Y | test(plugin): add T4 test 5

- [x] 3.40 C11: T4 event test 6 — idle-seq-2m-30m-6h
  What: tests/plugin/t4-6.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-6.md
  Commit: Y | test(plugin): add T4 test 6

- [x] 3.41 C11: T4 event test 7 — rapid-alt-10-cycles
  What: tests/plugin/t4-7.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-7.md
  Commit: Y | test(plugin): add T4 test 7

- [x] 3.42 C11: T4 event test 8 — homeostasis-non-destructive
  What: tests/plugin/t4-8.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-8.md
  Commit: Y | test(plugin): add T4 test 8

- [x] 3.43 C11: T4 event test 9 — homeostasis-raises-safety
  What: tests/plugin/t4-9.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-9.md
  Commit: Y | test(plugin): add T4 test 9

- [x] 3.44 C11: T4 event test 10 — homeostasis-logs-via-MCP
  What: tests/plugin/t4-10.test.js.
  Parallelization: W3 | Blocked: nothing | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:254-265
  Accept: node test passed:true. QA: Happy — error triggers homeo
  Evidence: .omo/evidence/c11-t4-10.md
  Commit: Y | test(plugin): add T4 test 10

- [x] 3.45 C12-p1: Session S_Map memory leak
  What: tests/plugin/session-basic.test.js. 10K sessions, memory < 100MB.
  Parallelization: W3 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: memory bounded. QA: Happy — 10K < 100MB. Failure — leak
  Evidence: .omo/evidence/c12-session-basic.md
  Commit: Y | test(plugin): add session basic test



### Wave 1 — Layer 1: Plugin Engine (35 tests) (15) + Config (15) + Conflict p2 (4) + T4 Events (10) + Session (1)


undefined
undefined

### Wave 1 — C20: Plugin conflict (4 tests)/order tests (4 tests)

- [x] 5.45 C20: Plugin execution order — oh-my-openagent fires before brain-plugin
  What: tests/plugin/plugin-order.test.js. When both plugins fire on tool.execute.before, verify execution order is consistent and both run.
  Parallelization: W5 | Blocked: C4 (plugin tests) | Blocks: nothing
  Refs: opencode.json plugin array, src/plugin/brain-plugin.mjs
  Accept: node test passed:true. QA: Happy — both fire in order
  Evidence: .omo/evidence/c20-plugin-order.md
  Commit: Y | test(plugin): add plugin order test

- [x] 5.46 C20: Plugin error isolation — one plugin throw does not kill other
  What: tests/plugin/plugin-error-isolation.test.js. Simulate oh-my-openagent throwing on tool.execute.before. Verify brain-plugin still fires.
  Parallelization: W5 | Blocked: C4 | Blocks: nothing
  Accept: brain-plugin hook fires despite sibling plugin error
  Evidence: .omo/evidence/c20-plugin-error.md
  Commit: Y | test(plugin): add plugin error isolation

- [x] 5.47 C20: Plugin output merging — both plugins mutate output.messages
  What: tests/plugin/plugin-output-merge.test.js. Both plugins append to output.messages. Verify both messages present, no overwrite.
  Parallelization: W5 | Blocked: C4 | Blocks: nothing
  Accept: output.messages contains entries from both plugins
  Evidence: .omo/evidence/c20-plugin-merge.md
  Commit: Y | test(plugin): add plugin output merge test

- [x] 5.48 C20: Plugin tool name collision — custom tool with built-in name
  What: tests/plugin/plugin-tool-collision.test.js. If both plugins define same-named tool, verify opencode resolution order.
  Parallelization: W5 | Blocked: C4 | Blocks: nothing
  Accept: plugin tool takes precedence per opencode docs
  Evidence: .omo/evidence/c20-plugin-collision.md
  Commit: Y | test(plugin): add plugin tool collision test



undefined

### Wave 2 — Layer 2: Core Signals + Rules (54 tests) (35) + Gates part 1 (10)

- [x] 1.1 C2: Signal perceive — single-signal strength
  What: tests/plugin/signal-individual-perceive.test.js. Set M_t state to produce only perceive signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-perceive.md
  Commit: Y | test(plugin): add signal perceive test

- [x] 1.2 C2: Signal emotion — single-signal strength
  What: tests/plugin/signal-individual-emotion.test.js. Set M_t state to produce only emotion signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-emotion.md
  Commit: Y | test(plugin): add signal emotion test

- [x] 1.3 C2: Signal safety — single-signal strength
  What: tests/plugin/signal-individual-safety.test.js. Set M_t state to produce only safety signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-safety.md
  Commit: Y | test(plugin): add signal safety test

- [x] 1.4 C2: Signal memory — single-signal strength
  What: tests/plugin/signal-individual-memory.test.js. Set M_t state to produce only memory signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-memory.md
  Commit: Y | test(plugin): add signal memory test

- [x] 1.5 C2: Signal reward — single-signal strength
  What: tests/plugin/signal-individual-reward.test.js. Set M_t state to produce only reward signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-reward.md
  Commit: Y | test(plugin): add signal reward test

- [x] 1.6 C2: Signal action — single-signal strength
  What: tests/plugin/signal-individual-action.test.js. Set M_t state to produce only action signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-action.md
  Commit: Y | test(plugin): add signal action test

- [x] 1.7 C2: Signal learning — single-signal strength
  What: tests/plugin/signal-individual-learning.test.js. Set M_t state to produce only learning signal. Verify correct strength, priority multiplication, instruction text.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — l1.size=0 gives strength 1.0. Failure — wrong instruction
  Evidence: .omo/evidence/c2-signal-learning.md
  Commit: Y | test(plugin): add signal learning test

- [x] 1.8 C2: Signal pair perceive+emotion — cross-product winner
  What: tests/plugin/signal-pair-perceive-emotion.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats emotion if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-emotion.md
  Commit: Y | test(plugin): add pair perceive-emotion test

- [x] 1.9 C2: Signal pair perceive+memory — cross-product winner
  What: tests/plugin/signal-pair-perceive-memory.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats memory if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-memory.md
  Commit: Y | test(plugin): add pair perceive-memory test

- [x] 1.10 C2: Signal pair perceive+reward — cross-product winner
  What: tests/plugin/signal-pair-perceive-reward.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats reward if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-reward.md
  Commit: Y | test(plugin): add pair perceive-reward test

- [x] 1.11 C2: Signal pair perceive+action — cross-product winner
  What: tests/plugin/signal-pair-perceive-action.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats action if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-action.md
  Commit: Y | test(plugin): add pair perceive-action test

- [x] 1.12 C2: Signal pair perceive+learning — cross-product winner
  What: tests/plugin/signal-pair-perceive-learning.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats learning if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-learning.md
  Commit: Y | test(plugin): add pair perceive-learning test

- [x] 1.13 C2: Signal pair perceive+safety — cross-product winner
  What: tests/plugin/signal-pair-perceive-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — perceive beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-perceive-safety.md
  Commit: Y | test(plugin): add pair perceive-safety test

- [x] 1.14 C2: Signal pair emotion+memory — cross-product winner
  What: tests/plugin/signal-pair-emotion-memory.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — emotion beats memory if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-emotion-memory.md
  Commit: Y | test(plugin): add pair emotion-memory test

- [x] 1.15 C2: Signal pair emotion+reward — cross-product winner
  What: tests/plugin/signal-pair-emotion-reward.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — emotion beats reward if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-emotion-reward.md
  Commit: Y | test(plugin): add pair emotion-reward test

- [x] 1.16 C2: Signal pair emotion+action — cross-product winner
  What: tests/plugin/signal-pair-emotion-action.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — emotion beats action if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-emotion-action.md
  Commit: Y | test(plugin): add pair emotion-action test

- [x] 1.17 C2: Signal pair emotion+learning — cross-product winner
  What: tests/plugin/signal-pair-emotion-learning.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — emotion beats learning if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-emotion-learning.md
  Commit: Y | test(plugin): add pair emotion-learning test

- [x] 1.18 C2: Signal pair emotion+safety — cross-product winner
  What: tests/plugin/signal-pair-emotion-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — emotion beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-emotion-safety.md
  Commit: Y | test(plugin): add pair emotion-safety test

- [x] 1.19 C2: Signal pair memory+reward — cross-product winner
  What: tests/plugin/signal-pair-memory-reward.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — memory beats reward if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-memory-reward.md
  Commit: Y | test(plugin): add pair memory-reward test

- [x] 1.20 C2: Signal pair memory+action — cross-product winner
  What: tests/plugin/signal-pair-memory-action.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — memory beats action if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-memory-action.md
  Commit: Y | test(plugin): add pair memory-action test

- [x] 1.21 C2: Signal pair memory+learning — cross-product winner
  What: tests/plugin/signal-pair-memory-learning.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — memory beats learning if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-memory-learning.md
  Commit: Y | test(plugin): add pair memory-learning test

- [x] 1.22 C2: Signal pair memory+safety — cross-product winner
  What: tests/plugin/signal-pair-memory-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — memory beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-memory-safety.md
  Commit: Y | test(plugin): add pair memory-safety test

- [x] 1.23 C2: Signal pair reward+action — cross-product winner
  What: tests/plugin/signal-pair-reward-action.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — reward beats action if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-reward-action.md
  Commit: Y | test(plugin): add pair reward-action test

- [x] 1.24 C2: Signal pair reward+learning — cross-product winner
  What: tests/plugin/signal-pair-reward-learning.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — reward beats learning if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-reward-learning.md
  Commit: Y | test(plugin): add pair reward-learning test

- [x] 1.25 C2: Signal pair reward+safety — cross-product winner
  What: tests/plugin/signal-pair-reward-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — reward beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-reward-safety.md
  Commit: Y | test(plugin): add pair reward-safety test

- [x] 1.26 C2: Signal pair action+learning — cross-product winner
  What: tests/plugin/signal-pair-action-learning.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — action beats learning if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-action-learning.md
  Commit: Y | test(plugin): add pair action-learning test

- [x] 1.27 C2: Signal pair action+safety — cross-product winner
  What: tests/plugin/signal-pair-action-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — action beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-action-safety.md
  Commit: Y | test(plugin): add pair action-safety test

- [x] 1.28 C2: Signal pair learning+safety — cross-product winner
  What: tests/plugin/signal-pair-learning-safety.test.js. Both signals full strength, verify winner by priority x strength math.
  Parallelization: W1 | Blocked: 1.1-1.7 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139
  Accept: node test returns passed:true
  QA: Happy — learning beats safety if higher strength. Failure — wrong winner
  Evidence: .omo/evidence/c2-pair-learning-safety.md
  Commit: Y | test(plugin): add pair learning-safety test

- [x] 1.29 C2: Triple perceive+emotion+safety — 3-signal competition
  What: tests/plugin/signal-triple-perceive-emotion-safety.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-perceive-emotion-safety.md
  Commit: Y | test(plugin): add triple test 1

- [x] 1.30 C2: Triple perceive+reward+action — 3-signal competition
  What: tests/plugin/signal-triple-perceive-reward-action.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-perceive-reward-action.md
  Commit: Y | test(plugin): add triple test 2

- [x] 1.31 C2: Triple emotion+reward+safety — 3-signal competition
  What: tests/plugin/signal-triple-emotion-reward-safety.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-emotion-reward-safety.md
  Commit: Y | test(plugin): add triple test 3

- [x] 1.32 C2: Triple memory+reward+learning — 3-signal competition
  What: tests/plugin/signal-triple-memory-reward-learning.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-memory-reward-learning.md
  Commit: Y | test(plugin): add triple test 4

- [x] 1.33 C2: Triple action+learning+safety — 3-signal competition
  What: tests/plugin/signal-triple-action-learning-safety.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-action-learning-safety.md
  Commit: Y | test(plugin): add triple test 5

- [x] 1.34 C2: Triple perceive+memory+learning — 3-signal competition
  What: tests/plugin/signal-triple-perceive-memory-learning.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-perceive-memory-learning.md
  Commit: Y | test(plugin): add triple test 6

- [x] 1.35 C2: Triple emotion+action+learning — 3-signal competition
  What: tests/plugin/signal-triple-emotion-action-learning.test.js. All 3 signals active, verify winner and runner-up.
  Parallelization: W1 | Blocked: 1.8-1.28 | Blocks: W3
  Refs: src/plugin/brain-hooks.mjs:46-139, :184-191
  Accept: node test returns passed:true
  QA: Happy — correct winner by strength. Failure — wrong ordering
  Evidence: .omo/evidence/c2-triple-emotion-action-learning.md
  Commit: Y | test(plugin): add triple test 7

- [x] 1.36 C3-p1: G1 bypass 1 — multiple-spaces
  What: tests/unit/g1-bypass-1.test.js. Test G1 regex against multiple-spaces variants. Must NOT retest basic G1.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: 3+ bypass patterns each blocked
  QA: Happy — dangerous cmd blocked. Failure — bypass passes
  Evidence: .omo/evidence/c3-g1-bypass-1.md
  Commit: Y | test(unit): add G1 bypass 1

- [x] 1.37 C3-p1: G1 bypass 2 — long-flags
  What: tests/unit/g1-bypass-2.test.js. Test G1 regex against long-flags variants. Must NOT retest basic G1.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: 3+ bypass patterns each blocked
  QA: Happy — dangerous cmd blocked. Failure — bypass passes
  Evidence: .omo/evidence/c3-g1-bypass-2.md
  Commit: Y | test(unit): add G1 bypass 2

- [x] 1.38 C3-p1: G1 bypass 3 — path-traversal
  What: tests/unit/g1-bypass-3.test.js. Test G1 regex against path-traversal variants. Must NOT retest basic G1.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: 3+ bypass patterns each blocked
  QA: Happy — dangerous cmd blocked. Failure — bypass passes
  Evidence: .omo/evidence/c3-g1-bypass-3.md
  Commit: Y | test(unit): add G1 bypass 3

- [x] 1.39 C3-p1: G1 bypass 4 — unicode-encoding
  What: tests/unit/g1-bypass-4.test.js. Test G1 regex against unicode-encoding variants. Must NOT retest basic G1.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: 3+ bypass patterns each blocked
  QA: Happy — dangerous cmd blocked. Failure — bypass passes
  Evidence: .omo/evidence/c3-g1-bypass-4.md
  Commit: Y | test(unit): add G1 bypass 4

- [x] 1.40 C3-p1: G1 bypass 5 — chaining-variants
  What: tests/unit/g1-bypass-5.test.js. Test G1 regex against chaining-variants variants. Must NOT retest basic G1.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: 3+ bypass patterns each blocked
  QA: Happy — dangerous cmd blocked. Failure — bypass passes
  Evidence: .omo/evidence/c3-g1-bypass-5.md
  Commit: Y | test(unit): add G1 bypass 5

- [x] 1.41 C3-p1: G2 bypass 1 — pipe-shell-variants
  What: tests/unit/g2-bypass-1.test.js. Test G2 regex against pipe-shell-variants.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:30-36
  Accept: 3+ suspicious patterns warned
  QA: Happy — suspicious detected. Failure — undetected
  Evidence: .omo/evidence/c3-g2-bypass-1.md
  Commit: Y | test(unit): add G2 bypass 1

- [x] 1.42 C3-p1: G2 bypass 2 — base64-decode-variants
  What: tests/unit/g2-bypass-2.test.js. Test G2 regex against base64-decode-variants.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:30-36
  Accept: 3+ suspicious patterns warned
  QA: Happy — suspicious detected. Failure — undetected
  Evidence: .omo/evidence/c3-g2-bypass-2.md
  Commit: Y | test(unit): add G2 bypass 2

- [x] 1.43 C3-p1: G2 bypass 3 — eval-variants
  What: tests/unit/g2-bypass-3.test.js. Test G2 regex against eval-variants.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:30-36
  Accept: 3+ suspicious patterns warned
  QA: Happy — suspicious detected. Failure — undetected
  Evidence: .omo/evidence/c3-g2-bypass-3.md
  Commit: Y | test(unit): add G2 bypass 3

- [x] 1.44 C3-p1: G2 bypass 4 — chmod-variants
  What: tests/unit/g2-bypass-4.test.js. Test G2 regex against chmod-variants.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:30-36
  Accept: 3+ suspicious patterns warned
  QA: Happy — suspicious detected. Failure — undetected
  Evidence: .omo/evidence/c3-g2-bypass-4.md
  Commit: Y | test(unit): add G2 bypass 4

- [x] 1.45 C3-p1: G2 bypass 5 — pipe-wget-variants
  What: tests/unit/g2-bypass-5.test.js. Test G2 regex against pipe-wget-variants.
  Parallelization: W1 | Blocked: nothing | Blocks: W3
  Refs: src/plugin/brain-plugin.mjs:30-36
  Accept: 3+ suspicious patterns warned
  QA: Happy — suspicious detected. Failure — undetected
  Evidence: .omo/evidence/c3-g2-bypass-5.md
  Commit: Y | test(unit): add G2 bypass 5


### Wave 6 continuation — C14: SWE-bench Lite Evaluation (6 todos)

SWE-bench Lite is an industry-standard benchmark for coding agents. Running it on brain-agent tests the FULL P→C→A loop with real GitHub issues.
The evaluation process itself IS runtime testing: it exercises L1 perception (issue understanding), L2 reasoning (approach), L3 action (code generation), and POST learning (outcome recording).

- [x] 6.39 C14: Install SWE-bench framework
  What: npm install swe-bench or pip install swebench. Verify CLI works. Create C:\Users\86189\Desktop\brain-agent\benchmarks\swe-bench\ directory.
  Must NOT modify existing dependencies. Add to devDependencies only.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: C14 test harness
  Refs: https://github.com/princeton-nlp/SWE-bench
  Accept: swe-bench --help exits 0
  Evidence: .omo/evidence/c14-swe-install.md
  Commit: Y | chore(deps): add SWE-bench

- [x] 6.40 C14: Create brain-agent SWE-bench harness
  What: Create benchmarks/swe-bench/harness.mjs. A harness that:
  (a) Takes a GitHub issue (repo, issue_id, base_commit, test_patch)
  (b) Clones the repo at base_commit
  (c) Starts an agentic coding session with brain-master.md as orchestrator prompt
  (d) Feeds the issue description as the user message
  (e) Records all tool calls, signals, and the final git diff
  (f) Returns {patch, mechanisms, success} where patch is the generated diff
  The harness must work in an isolated sandboxed environment. Must NOT use real github API.
  Parallelization: W6 (manual) | Blocked: 6.39 | Blocks: C14 benchmark runs
  Refs: .opencode/skills/brain-master.md, swe-bench docs
  Accept: harness can process 1 SWE-bench task end-to-end
  Evidence: .omo/evidence/c14-swe-harness.md
  Commit: Y | feat(bench): add SWE-bench harness

- [x] 6.41 C14: Run SWE-bench Lite on 10-task subset
  What: Run harness on 10 tasks from SWE-bench Lite (smallest/quickest). Assert: at least 1 resolved (pass@1 > 0).
  Measure: pass@1, pass@3, avg_turns_per_task, avg_tools_per_task.
  Record mechanism data for each task: which signals fired, which gates triggered, how many L1-perceive cycles per task.
  Parallelization: W6 (manual) | Blocked: 6.40 | Blocks: full run
  Refs: benchmarks/swe-bench/harness.mjs
  Accept: 10 tasks complete. At least 1 resolved.
  Evidence: .omo/evidence/c14-swe-10tasks.md
  Commit: Y | feat(bench): SWE-bench 10-task results

- [x] 6.42 C14: Run SWE-bench Lite on 40 more tasks (50 total)
  What: Run remaining 40 tasks. Assert: pass@1 >= 10% (brain-agent baseline).
  Compare with published SWE-bench Lite scores. Generate report.
  Parallelization: W6 (manual) | Blocked: 6.41 | Blocks: analysis
  Refs: benchmarks/swe-bench/
  Accept: 50 tasks complete, pass@1 calculated
  Evidence: .omo/evidence/c14-swe-50tasks.md
  Commit: Y | feat(bench): SWE-bench 50-task results

- [x] 6.43 C14: Analyze SWE-bench results — mechanism-to-outcome correlation
  What: Correlate mechanism data (signals, gates, mood, L1 cycles) with task resolution status.
  Questions: Do resolved tasks have more perceive+action signals? Fewer gate blocks? Better mood decay?
  Generate correlation report in .omo/evidence/c14-swe-analysis.md.
  Parallelization: W6 (manual) | Blocked: 6.42 | Blocks: nothing
  Refs: .omo/evidence/c14-swe-*
  Accept: correlation report generated with at least 3 findings
  Evidence: .omo/evidence/c14-swe-analysis.md
  Commit: Y | docs(bench): SWE-bench mechanism analysis

- [x] 6.44 C14: SWE-bench test suite for regression (GitHub Actions)
  What: Create GitHub Actions workflow .github/workflows/swe-bench.yml. Runs 10 smallest SWE-bench tasks on PR. Fails if pass@1 drops > 20% from baseline.
  Must NOT run full 50 in CI (too expensive). Use caching.
  Parallelization: W6 (manual) | Blocked: 6.42 | Blocks: nothing
  Refs: benchmarks/swe-bench/harness.mjs
  Accept: workflow runs on push, reports pass@1
  Evidence: .omo/evidence/c14-swe-ci.md
  Commit: Y | ci: add SWE-bench regression workflow


## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE.
- [x] F1. Plan compliance — all todos completed, all evidence in .omo/evidence/
- [x] F2. Code quality — no eval, no process.exit, all imports resolvable
- [x] F3. Real QA — `node tests/runner.js --all --runtime`, 100% PASS
- [x] F4. Scope fidelity — git diff shows only new files, no existing modified
- [x] F5. Coverage gap audit — every brain-agent source file has at least 1 test

## Commit strategy
- 7 commits, one per wave (W0-W6)
- Format: test|<perf>|<feat>(<scope>): add <component> (<count>)
- W6: `feat(bench): add SWE-bench Lite evaluation (6)`

## Success criteria
- [x] All todos completed with [x]
- [x] All evidence files in .omo/evidence/ with PASS status
- [x] `node tests/runner.js --all` passes (existing tests unbroken)
- [x] All 22 components (C1-C22) all have at least 1 passing test, ~299 total tests across 7 waves (Agentest scenarios each count as 1 todo but produce 3+ assertions)
- [x] Expanded agentest-handler.mjs handles all 15 user scenarios (C13b)
- [x] All 8 MCP servers have protocol/persistence/concurrency coverage
- [x] All 7 signals tested in isolation + all 21 cross-product pairs (C2)
- [x] All 7 safety gates tested against 5 bypass vectors each = 35 gate tests (C3)
- [x] 3 cross-circuit conflict rules verified active
- [x] 50 Agentest simulation scenarios pass (C13) + SWE-bench Lite 50-task baseline (C14) — each with 3+ deterministic mechanism assertions
- [x] No existing test files modified
- [x] SWE-bench pass@1 >= 10% baseline

### Wave 4 — Layer 4: MCP Services + Data Flow (70 tests) (45) + Session part 2 (7)

- [x] 4.1 C1: memory-store test 1 — protocol init
  What: tests/mcp/memory-1.test.js. Memory-store MCP protocol init scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-1.md
  Commit: Y | test(mcp): add memory-store test 1

- [x] 4.2 C1: memory-store test 2 — store/retrieve
  What: tests/mcp/memory-2.test.js. Memory-store MCP store/retrieve scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-2.md
  Commit: Y | test(mcp): add memory-store test 2

- [x] 4.3 C1: memory-store test 3 — search
  What: tests/mcp/memory-3.test.js. Memory-store MCP search scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-3.md
  Commit: Y | test(mcp): add memory-store test 3

- [x] 4.4 C1: memory-store test 4 — summarize
  What: tests/mcp/memory-4.test.js. Memory-store MCP summarize scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-4.md
  Commit: Y | test(mcp): add memory-store test 4

- [x] 4.5 C1: memory-store test 5 — forget non-existent
  What: tests/mcp/memory-5.test.js. Memory-store MCP forget non-existent scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-5.md
  Commit: Y | test(mcp): add memory-store test 5

- [x] 4.6 C1: memory-store test 6 — empty key error
  What: tests/mcp/memory-6.test.js. Memory-store MCP empty key error scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-6.md
  Commit: Y | test(mcp): add memory-store test 6

- [x] 4.7 C1: memory-store test 7 — persistence restart
  What: tests/mcp/memory-7.test.js. Memory-store MCP persistence restart scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-7.md
  Commit: Y | test(mcp): add memory-store test 7

- [x] 4.8 C1: memory-store test 8 — concurrency 10 parallel
  What: tests/mcp/memory-8.test.js. Memory-store MCP concurrency 10 parallel scenario.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/memory-store/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works correctly. Failure — error returned
  Evidence: .omo/evidence/c1-memory-8.md
  Commit: Y | test(mcp): add memory-store test 8

- [x] 4.9 C1: world-model test 1 — protocol init
  What: tests/mcp/world-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-1.md
  Commit: Y | test(mcp): add world-model test 1

- [x] 4.10 C1: world-model test 2 — world_query structure
  What: tests/mcp/world-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-2.md
  Commit: Y | test(mcp): add world-model test 2

- [x] 4.11 C1: world-model test 3 — world_update files
  What: tests/mcp/world-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-3.md
  Commit: Y | test(mcp): add world-model test 3

- [x] 4.12 C1: world-model test 4 — world_predict prediction
  What: tests/mcp/world-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-4.md
  Commit: Y | test(mcp): add world-model test 4

- [x] 4.13 C1: world-model test 5 — query non-existent
  What: tests/mcp/world-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-5.md
  Commit: Y | test(mcp): add world-model test 5

- [x] 4.14 C1: world-model test 6 — diff empty arrays
  What: tests/mcp/world-6.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-6.md
  Commit: Y | test(mcp): add world-model test 6

- [x] 4.15 C1: world-model test 7 — concurrency 5 parallel
  What: tests/mcp/world-7.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/world-model/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-world-7.md
  Commit: Y | test(mcp): add world-model test 7

- [x] 4.16 C1: reward-system test 1 — protocol init
  What: tests/mcp/reward-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-1.md
  Commit: Y | test(mcp): add reward test 1

- [x] 4.17 C1: reward-system test 2 — score_action result
  What: tests/mcp/reward-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-2.md
  Commit: Y | test(mcp): add reward test 2

- [x] 4.18 C1: reward-system test 3 — record_outcome+report
  What: tests/mcp/reward-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-3.md
  Commit: Y | test(mcp): add reward test 3

- [x] 4.19 C1: reward-system test 4 — value_learn feedback
  What: tests/mcp/reward-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-4.md
  Commit: Y | test(mcp): add reward test 4

- [x] 4.20 C1: reward-system test 5 — persistence restart
  What: tests/mcp/reward-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-5.md
  Commit: Y | test(mcp): add reward test 5

- [x] 4.21 C1: reward-system test 6 — concurrency 5 parallel
  What: tests/mcp/reward-6.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reward-system/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reward-6.md
  Commit: Y | test(mcp): add reward test 6

- [x] 4.22 C1: tool-tracker test 1 — protocol init
  What: tests/mcp/tracker-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-1.md
  Commit: Y | test(mcp): add tracker test 1

- [x] 4.23 C1: tool-tracker test 2 — track_tool_use
  What: tests/mcp/tracker-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-2.md
  Commit: Y | test(mcp): add tracker test 2

- [x] 4.24 C1: tool-tracker test 3 — get_tool_stats
  What: tests/mcp/tracker-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-3.md
  Commit: Y | test(mcp): add tracker test 3

- [x] 4.25 C1: tool-tracker test 4 — score_agent
  What: tests/mcp/tracker-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-4.md
  Commit: Y | test(mcp): add tracker test 4

- [x] 4.26 C1: tool-tracker test 5 — agent_reputation
  What: tests/mcp/tracker-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-5.md
  Commit: Y | test(mcp): add tracker test 5

- [x] 4.27 C1: tool-tracker test 6 — concurrency 5 parallel
  What: tests/mcp/tracker-6.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/tool-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-tracker-6.md
  Commit: Y | test(mcp): add tracker test 6

- [x] 4.28 C1: sop-tracker test 1 — protocol init
  What: tests/mcp/sop-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/sop-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-sop-1.md
  Commit: Y | test(mcp): add sop-tracker test 1

- [x] 4.29 C1: sop-tracker test 2 — register+match
  What: tests/mcp/sop-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/sop-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-sop-2.md
  Commit: Y | test(mcp): add sop-tracker test 2

- [x] 4.30 C1: sop-tracker test 3 — decision threshold
  What: tests/mcp/sop-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/sop-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-sop-3.md
  Commit: Y | test(mcp): add sop-tracker test 3

- [x] 4.31 C1: sop-tracker test 4 — list filter
  What: tests/mcp/sop-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/sop-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-sop-4.md
  Commit: Y | test(mcp): add sop-tracker test 4

- [x] 4.32 C1: sop-tracker test 5 — ppo_score update
  What: tests/mcp/sop-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/sop-tracker/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-sop-5.md
  Commit: Y | test(mcp): add sop-tracker test 5

- [x] 4.33 C1: reflexion test 1 — protocol init
  What: tests/mcp/reflexion-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reflexion/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reflexion-1.md
  Commit: Y | test(mcp): add reflexion test 1

- [x] 4.34 C1: reflexion test 2 — start cycle
  What: tests/mcp/reflexion-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reflexion/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reflexion-2.md
  Commit: Y | test(mcp): add reflexion test 2

- [x] 4.35 C1: reflexion test 3 — add_obs+generate
  What: tests/mcp/reflexion-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reflexion/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reflexion-3.md
  Commit: Y | test(mcp): add reflexion test 3

- [x] 4.36 C1: reflexion test 4 — history list
  What: tests/mcp/reflexion-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reflexion/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reflexion-4.md
  Commit: Y | test(mcp): add reflexion test 4

- [x] 4.37 C1: reflexion test 5 — apply lessons
  What: tests/mcp/reflexion-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/reflexion/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-reflexion-5.md
  Commit: Y | test(mcp): add reflexion test 5

- [x] 4.38 C1: priority-queue test 1 — protocol init
  What: tests/mcp/queue-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/priority-queue/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-queue-1.md
  Commit: Y | test(mcp): add queue test 1

- [x] 4.39 C1: priority-queue test 2 — queue_add task
  What: tests/mcp/queue-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/priority-queue/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-queue-2.md
  Commit: Y | test(mcp): add queue test 2

- [x] 4.40 C1: priority-queue test 3 — queue_next priority
  What: tests/mcp/queue-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/priority-queue/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-queue-3.md
  Commit: Y | test(mcp): add queue test 3

- [x] 4.41 C1: priority-queue test 4 — queue_complete done
  What: tests/mcp/queue-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/priority-queue/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-queue-4.md
  Commit: Y | test(mcp): add queue test 4

- [x] 4.42 C1: priority-queue test 5 — queue_stats counts
  What: tests/mcp/queue-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/priority-queue/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-queue-5.md
  Commit: Y | test(mcp): add queue test 5

- [x] 4.43 C1: monitor test 1 — protocol init
  What: tests/mcp/monitor-1.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/monitor/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-monitor-1.md
  Commit: Y | test(mcp): add monitor test 1

- [x] 4.44 C1: monitor test 2 — report_event
  What: tests/mcp/monitor-2.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/monitor/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-monitor-2.md
  Commit: Y | test(mcp): add monitor test 2

- [x] 4.45 C1: monitor test 3 — get_alerts filter
  What: tests/mcp/monitor-3.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/monitor/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-monitor-3.md
  Commit: Y | test(mcp): add monitor test 3

- [x] 4.46 C1: monitor test 4 — get_health status
  What: tests/mcp/monitor-4.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/monitor/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-monitor-4.md
  Commit: Y | test(mcp): add monitor test 4

- [x] 4.47 C1: monitor test 5 — escalate route
  What: tests/mcp/monitor-5.test.js.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: src/mcp/monitor/src/server.ts
  Accept: node test returns passed:true
  QA: Happy — works. Failure — error
  Evidence: .omo/evidence/c1-monitor-5.md
  Commit: Y | test(mcp): add monitor test 5

- [x] 4.49 C1: Mixed MCP concurrency — 3 servers
  What: tests/mcp/mixed-concurrency-1.test.js. 3 MCP servers memory+reward+tool receiving parallel calls.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: all MCP server.ts files
  Accept: all respond. Failure — timeout
  Evidence: .omo/evidence/c1-mixed-conc-1.md
  Commit: Y | test(mcp): add mixed concurrency test 1

- [x] 4.50 C1: Mixed MCP concurrency — all 8 servers
  What: tests/mcp/mixed-concurrency-2.test.js. All 8 MCPs started and queried concurrently.
  Parallelization: W4 | Blocked: MCP dist/ built | Blocks: W5/W6
  Refs: all MCP server.ts
  Accept: all 8 respond within 5s
  QA: Happy — all 8 respond. Failure — any timeout
  Evidence: .omo/evidence/c1-mixed-conc-2.md
  Commit: Y | test(mcp): add mixed concurrency test 2

- [x] 4.51 C12-p2: Session isolation test 1 — 2 sessions isolated
  What: tests/plugin/session-1.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-1.md
  Commit: Y | test(plugin): add session test 1

- [x] 4.52 C12-p2: Session isolation test 2 — 5 sessions isolated
  What: tests/plugin/session-2.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-2.md
  Commit: Y | test(plugin): add session test 2

- [x] 4.53 C12-p2: Session isolation test 3 — 100 sessions
  What: tests/plugin/session-3.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-3.md
  Commit: Y | test(plugin): add session test 3

- [x] 4.54 C12-p2: Session isolation test 4 — concurrent updates no race
  What: tests/plugin/session-4.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-4.md
  Commit: Y | test(plugin): add session test 4

- [x] 4.55 C12-p2: Session isolation test 5 — TTL/close
  What: tests/plugin/session-5.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-5.md
  Commit: Y | test(plugin): add session test 5

- [x] 4.56 C12-p2: Session isolation test 6 — metrics count
  What: tests/plugin/session-6.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-6.md
  Commit: Y | test(plugin): add session test 6

- [x] 4.57 C12-p2: Session isolation test 7 — crash recovery
  What: tests/plugin/session-7.test.js.
  Parallelization: W4 | Blocked: W1 | Blocks: W5
  Refs: src/plugin/brain-hooks.mjs:22, :286
  Accept: node test returns passed:true
  QA: Happy — ses1 CAUTION, ses2 stays NORMAL. Failure — contamination
  Evidence: .omo/evidence/c12-session-7.md
  Commit: Y | test(plugin): add session test 7




### Wave 5 — Layer 5: Integration — E2E + Runtime (65 tests): Cross-component E2E (15) + Runtime part 1 (27)

- [x] 5.1 C7: Cross-E2E test 1 — basic cycle message-L1-L1.5-L2-L3-POST
  What: tests/integration/cross-e2e-1.test.js. Simulate basic cycle message-L1-L1.5-L2-L3-POST scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-1.md
  Commit: Y | test(integration): add cross-E2E test 1

- [x] 5.2 C7: Cross-E2E test 2 — mood amygdala to L2 safety gate
  What: tests/integration/cross-e2e-2.test.js. Simulate mood amygdala to L2 safety gate scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-2.md
  Commit: Y | test(integration): add cross-E2E test 2

- [x] 5.3 C7: Cross-E2E test 3 — world predict-action-update-diff
  What: tests/integration/cross-e2e-3.test.js. Simulate world predict-action-update-diff scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-3.md
  Commit: Y | test(integration): add cross-E2E test 3

- [x] 5.4 C7: Cross-E2E test 4 — WTA gate competition scoring
  What: tests/integration/cross-e2e-4.test.js. Simulate WTA gate competition scoring scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-4.md
  Commit: Y | test(integration): add cross-E2E test 4

- [x] 5.5 C7: Cross-E2E test 5 — POST reflexion-memory-outcome-score-world
  What: tests/integration/cross-e2e-5.test.js. Simulate POST reflexion-memory-outcome-score-world scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-5.md
  Commit: Y | test(integration): add cross-E2E test 5

- [x] 5.6 C7: Cross-E2E test 6 — swarm planner-coder-reviewer-tester
  What: tests/integration/cross-e2e-6.test.js. Simulate swarm planner-coder-reviewer-tester scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-6.md
  Commit: Y | test(integration): add cross-E2E test 6

- [x] 5.7 C7: Cross-E2E test 7 — consensus high-risk 3-agent vote
  What: tests/integration/cross-e2e-7.test.js. Simulate consensus high-risk 3-agent vote scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-7.md
  Commit: Y | test(integration): add cross-E2E test 7

- [x] 5.8 C7: Cross-E2E test 8 — homeostasis insula corrective
  What: tests/integration/cross-e2e-8.test.js. Simulate homeostasis insula corrective scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-8.md
  Commit: Y | test(integration): add cross-E2E test 8

- [x] 5.9 C7: Cross-E2E test 9 — attention budget cap enforcement
  What: tests/integration/cross-e2e-9.test.js. Simulate attention budget cap enforcement scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-9.md
  Commit: Y | test(integration): add cross-E2E test 9

- [x] 5.10 C7: Cross-E2E test 10 — personality trait drift cycles
  What: tests/integration/cross-e2e-10.test.js. Simulate personality trait drift cycles scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-10.md
  Commit: Y | test(integration): add cross-E2E test 10

- [x] 5.11 C7: Cross-E2E test 11 — DMN idle mind-wandering
  What: tests/integration/cross-e2e-11.test.js. Simulate DMN idle mind-wandering scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-11.md
  Commit: Y | test(integration): add cross-E2E test 11

- [x] 5.12 C7: Cross-E2E test 12 — learning lessons flow back to L1
  What: tests/integration/cross-e2e-12.test.js. Simulate learning lessons flow back to L1 scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-12.md
  Commit: Y | test(integration): add cross-E2E test 12

- [x] 5.13 C7: Cross-E2E test 13 — memory decay-consolidate-conflict
  What: tests/integration/cross-e2e-13.test.js. Simulate memory decay-consolidate-conflict scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-13.md
  Commit: Y | test(integration): add cross-E2E test 13

- [x] 5.14 C7: Cross-E2E test 14 — gate-tuner adaptive adjustment
  What: tests/integration/cross-e2e-14.test.js. Simulate gate-tuner adaptive adjustment scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-14.md
  Commit: Y | test(integration): add cross-E2E test 14

- [x] 5.15 C7: Cross-E2E test 15 — full pipeline 10-message sequence
  What: tests/integration/cross-e2e-15.test.js. Simulate full pipeline 10-message sequence scenario.
  Parallelization: W5 | Blocked: W3/W4 | Blocks: W6
  Refs: .opencode/skills/brain-master.md
  Accept: node test returns passed:true
  QA: Happy — phases fire in order. Failure — phase skipped
  Evidence: .omo/evidence/c7-e2e-15.md
  Commit: Y | test(integration): add cross-E2E test 15

- [x] 5.16 C13b: User scenario hello
  What: tests/behavioral/agentest/scenarios/c13-hello.sim.ts via Agentest.
  Scenario: simple greeting, verify perceive signal wins.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-hello.md
  Commit: Y | test(runtime): add Agentest scenario hello

- [x] 5.17 C13b: User scenario add-dark-mode
  What: tests/behavioral/agentest/scenarios/c13-add-dark-mode.sim.ts via Agentest.
  Scenario: feature request, verify swarm detection triggers action signal.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-add-dark-mode.md
  Commit: Y | test(runtime): add Agentest scenario add-dark-mode

- [x] 5.18 C13b: User scenario button-broken
  What: tests/behavioral/agentest/scenarios/c13-button-broken.sim.ts via Agentest.
  Scenario: bug report, verify emotion signal (URGENT) activates.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-button-broken.md
  Commit: Y | test(runtime): add Agentest scenario button-broken

- [x] 5.19 C13b: User scenario dangerous-command
  What: tests/behavioral/agentest/scenarios/c13-dangerous-command.sim.ts via Agentest.
  Scenario: verify G1 blocks via plugin gate patterns.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-dangerous-command.md
  Commit: Y | test(runtime): add Agentest scenario dangerous-command

- [x] 5.20 C13b: User scenario refactor-auth
  What: tests/behavioral/agentest/scenarios/c13-refactor-auth.sim.ts via Agentest.
  Scenario: complex refactor, verify all 5 L1 agents fire + action signal.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-refactor-auth.md
  Commit: Y | test(runtime): add Agentest scenario refactor-auth

- [x] 5.21 C13b: User scenario cjk-login
  What: tests/behavioral/agentest/scenarios/c13-cjk-login.sim.ts via Agentest.
  Scenario: Chinese: 实现用户登录, verify no CJK handling issues.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-cjk-login.md
  Commit: Y | test(runtime): add Agentest scenario cjk-login

- [x] 5.22 C13b: User scenario multi-turn-5
  What: tests/behavioral/agentest/scenarios/c13-multi-turn-5.sim.ts via Agentest.
  Scenario: 5-turn conversation, verify M_t state persists across turns.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-multi-turn-5.md
  Commit: Y | test(runtime): add Agentest scenario multi-turn-5

- [x] 5.23 C13b: User scenario angry-user
  What: tests/behavioral/agentest/scenarios/c13-angry-user.sim.ts via Agentest.
  Scenario: WHY BROKEN!!, verify amygdala URGENT mode detected.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-angry-user.md
  Commit: Y | test(runtime): add Agentest scenario angry-user

- [x] 5.24 C13b: User scenario vague-request
  What: tests/behavioral/agentest/scenarios/c13-vague-request.sim.ts via Agentest.
  Scenario: make it good, verify perceive signal wins (fuzzy=intent unclear).
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-vague-request.md
  Commit: Y | test(runtime): add Agentest scenario vague-request

- [x] 5.25 C13b: User scenario screenshot
  What: tests/behavioral/agentest/scenarios/c13-screenshot.sim.ts via Agentest.
  Scenario: uploaded a screenshot, verify no crash.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-screenshot.md
  Commit: Y | test(runtime): add Agentest scenario screenshot

- [x] 5.26 C13b: User scenario urgent-fix
  What: tests/behavioral/agentest/scenarios/c13-urgent-fix.sim.ts via Agentest.
  Scenario: FIX NOW, verify URGENT→signal competition correctly.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-urgent-fix.md
  Commit: Y | test(runtime): add Agentest scenario urgent-fix

- [x] 5.27 C13b: User scenario how-auth-works
  What: tests/behavioral/agentest/scenarios/c13-how-auth-works.sim.ts via Agentest.
  Scenario: question, verify hippocampus memory retrieval referenced.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-how-auth-works.md
  Commit: Y | test(runtime): add Agentest scenario how-auth-works

- [x] 5.28 C13b: User scenario concurrent-requests
  What: tests/behavioral/agentest/scenarios/c13-concurrent-requests.sim.ts via Agentest.
  Scenario: 2 requests in parallel, verify session isolation.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-concurrent-requests.md
  Commit: Y | test(runtime): add Agentest scenario concurrent-requests

- [x] 5.29 C13b: User scenario requirement-flip
  What: tests/behavioral/agentest/scenarios/c13-requirement-flip.sim.ts via Agentest.
  Scenario: MongoDB→PostgreSQL switch, verify mood change tracked.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-requirement-flip.md
  Commit: Y | test(runtime): add Agentest scenario requirement-flip

- [x] 5.30 C13b: User scenario chinese-refactor
  What: tests/behavioral/agentest/scenarios/c13-chinese-refactor.sim.ts via Agentest.
  Scenario: Chinese complex request, verify full pipeline.
  Uses expanded agentest-handler.mjs to record mechanism data for assertions.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, tests/agentest-handler.mjs
  Accept: npx agentest run completes with all checks PASS
  QA: Happy — correct mechanisms fire. Failure — missing mechanism
  Evidence: .omo/evidence/c13-scenario-chinese-refactor.md
  Commit: Y | test(runtime): add Agentest scenario chinese-refactor

- [x] 5.31 C13c: Long dialog dialog-10turns
  What: tests/behavioral/agentest/scenarios/c13-dialog-10turns.sim.ts via Agentest.
  10-turn alternating conversation via Agentest multi-turn. Assert: M_t state persists, version increments each turn.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, src/plugin/brain-hooks.mjs
  Accept: npx agentest run completes, all assertions pass
  Evidence: .omo/evidence/c13-dialog-10turns.md
  Commit: Y | test(runtime): add Agentest dialog-10turns

- [x] 5.32 C13c: Long dialog dialog-50turns
  What: tests/behavioral/agentest/scenarios/c13-dialog-50turns.sim.ts via Agentest.
  50-turn with varied topics. Assert: mood decay smooth, memory stable.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, src/plugin/brain-hooks.mjs
  Accept: npx agentest run completes, all assertions pass
  Evidence: .omo/evidence/c13-dialog-50turns.md
  Commit: Y | test(runtime): add Agentest dialog-50turns

- [x] 5.33 C13c: Long dialog dialog-100turns
  What: tests/behavioral/agentest/scenarios/c13-dialog-100turns.sim.ts via Agentest.
  100-turn stress via Agentest. Assert: memory < 50MB, no crash.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, src/plugin/brain-hooks.mjs
  Accept: npx agentest run completes, all assertions pass
  Evidence: .omo/evidence/c13-dialog-100turns.md
  Commit: Y | test(runtime): add Agentest dialog-100turns

- [x] 5.34 C13c: Long dialog dialog-dedup
  What: tests/behavioral/agentest/scenarios/c13-dialog-dedup.sim.ts via Agentest.
  same message sent 10x in a row. Assert: signal dedup: getStrongestSignal returns [] after 2nd repeat.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, src/plugin/brain-hooks.mjs
  Accept: npx agentest run completes, all assertions pass
  Evidence: .omo/evidence/c13-dialog-dedup.md
  Commit: Y | test(runtime): add Agentest dialog-dedup

- [x] 5.35 C13c: Long dialog dialog-mood-oscillate
  What: tests/behavioral/agentest/scenarios/c13-dialog-mood-oscillate.sim.ts via Agentest.
  angry→calm→urgent→normal cycle 20 turns. Assert: mood transitions are gradual (decay formula correct).
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md, src/plugin/brain-hooks.mjs
  Accept: npx agentest run completes, all assertions pass
  Evidence: .omo/evidence/c13-dialog-mood-oscillate.md
  Commit: Y | test(runtime): add Agentest dialog-mood-oscillate

- [x] 5.35 C13c: Mood oscillation over 20 turns
  What: tests/runtime/dialog-mood-oscillate.test.js. Angry-calm-urgent-normal cycle 20 turns. Verify mood decay smooths oscillations.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: .opencode/skills/brain-master.md:161-181
  Accept: mood transitions gradual, not abrupt.
  Evidence: .omo/evidence/c13-dialog-mood.md
  Commit: Y | test(runtime): add mood oscillation test

- [x] 5.36 C13d: Concurrent session 2
  What: tests/runtime/concurrent-2.test.js. 2 parallel sessions via MockSession.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: all sessions isolated, no cross-contamination.
  QA: Happy — all 2 sessions produce correct states. Failure — bleed
  Evidence: .omo/evidence/c13-concurrent-2.md
  Commit: Y | test(runtime): add concurrent 2 test

- [x] 5.37 C13d: Concurrent session 5
  What: tests/runtime/concurrent-5.test.js. 5 parallel sessions via MockSession.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: all sessions isolated, no cross-contamination.
  QA: Happy — all 5 sessions produce correct states. Failure — bleed
  Evidence: .omo/evidence/c13-concurrent-5.md
  Commit: Y | test(runtime): add concurrent 5 test

- [x] 5.38 C13d: Concurrent session 10
  What: tests/runtime/concurrent-10.test.js. 10 parallel sessions via MockSession.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: all sessions isolated, no cross-contamination.
  QA: Happy — all 10 sessions produce correct states. Failure — bleed
  Evidence: .omo/evidence/c13-concurrent-10.md
  Commit: Y | test(runtime): add concurrent 10 test

- [x] 5.39 C13d: Concurrent session 20
  What: tests/runtime/concurrent-20.test.js. 20 parallel sessions via MockSession.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: all sessions isolated, no cross-contamination.
  QA: Happy — all 20 sessions produce correct states. Failure — bleed
  Evidence: .omo/evidence/c13-concurrent-20.md
  Commit: Y | test(runtime): add concurrent 20 test

- [x] 5.40 C13d: Concurrent session 50
  What: tests/runtime/concurrent-50.test.js. 50 parallel sessions via MockSession.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-hooks.mjs:22
  Accept: all sessions isolated, no cross-contamination.
  QA: Happy — all 50 sessions produce correct states. Failure — bleed
  Evidence: .omo/evidence/c13-concurrent-50.md
  Commit: Y | test(runtime): add concurrent 50 test

- [x] 5.41 C13e: Plugin lifecycle full cycle (T1→T2→T3→T4)
  What: tests/behavioral/agentest/scenarios/c13-lifecycle-full.sim.ts. Verify all 4 hooks fire in order.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-plugin.mjs:78-241
  Accept: npx agentest run, mechanism data shows T3→T1→T2→T4 sequence
  Evidence: .omo/evidence/c13-lifecycle-full.md
  Commit: Y | test(runtime): add Agentest lifecycle full

- [x] 5.42 C13e: Plugin lifecycle G1 block
  What: tests/behavioral/agentest/scenarios/c13-lifecycle-g1.sim.ts. Send dangerous command, verify G1 blocks via handler gate recording.
  Parallelization: W5 | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: mechanism data shows gate=G1 blocked
  Evidence: .omo/evidence/c13-lifecycle-g1.md
  Commit: Y | test(runtime): add Agentest lifecycle G1

- [x] 5.42 C13e: Plugin lifecycle G1 block
  What: tests/runtime/lifecycle-g1block.test.js. Send dangerous command. Verify G1 throws, after hook not called.
  Parallelization: W5 | Blocked: W0 | Blocks: W6
  Refs: src/plugin/brain-plugin.mjs:24-27
  Accept: G1 throws before output mutation.
  QA: Happy — dangerous cmd blocked. Failure — passes through
  Evidence: .omo/evidence/c13-lifecycle-g1.md
  Commit: Y | test(runtime): add lifecycle G1 block test





### Wave 6 — Layer 6: System — SWE-bench + Performance (31 tests) Manual: Performance Benchmarks (20) + Runtime part 2 (15)

- [x] 6.1 C5: Signal perf 1 — getStrongestSignal P50/P95 100 sessions
  What: benchmarks/perf-signal-1.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-1.md
  Commit: Y | perf: add signal perf 1

- [x] 6.2 C5: Signal perf 2 — getStrongestSignal P50/P95 1000 sessions
  What: benchmarks/perf-signal-2.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-2.md
  Commit: Y | perf: add signal perf 2

- [x] 6.3 C5: Signal perf 3 — getStrongestSignal P50/P95 10000 sessions
  What: benchmarks/perf-signal-3.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-3.md
  Commit: Y | perf: add signal perf 3

- [x] 6.4 C5: Signal perf 4 — signal computation throughput signals/sec
  What: benchmarks/perf-signal-4.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-4.md
  Commit: Y | perf: add signal perf 4

- [x] 6.5 C5: Signal perf 5 — onMessage latency 100/1000/10000 sessions
  What: benchmarks/perf-signal-5.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-5.md
  Commit: Y | perf: add signal perf 5

- [x] 6.6 C5: Signal perf 6 — onToolBefore latency
  What: benchmarks/perf-signal-6.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-6.md
  Commit: Y | perf: add signal perf 6

- [x] 6.7 C5: Signal perf 7 — onToolAfter latency
  What: benchmarks/perf-signal-7.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-7.md
  Commit: Y | perf: add signal perf 7

- [x] 6.8 C5: Signal perf 8 — full T1-T2-T3 cycle latency
  What: benchmarks/perf-signal-8.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-8.md
  Commit: Y | perf: add signal perf 8

- [x] 6.9 C5: Signal perf 9 — S_Map memory growth per 1000 sessions
  What: benchmarks/perf-signal-9.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-9.md
  Commit: Y | perf: add signal perf 9

- [x] 6.10 C5: Signal perf 10 — signal dedup overhead
  What: benchmarks/perf-signal-10.bench.js.
  Parallelization: W6 (manual) | Blocked: nothing | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs:171-200
  Accept: outputs P50/P95/P99 and throughput
  QA: Happy — P50 < 1ms. Failure — P95 > 10ms = regression
  Evidence: .omo/evidence/c5-perf-signal-10.md
  Commit: Y | perf: add signal perf 10

- [x] 6.11 C5: MCP perf 1 — memory-store P50/P95 100/1K/10K ops
  What: benchmarks/perf-mcp-1.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-1.md
  Commit: Y | perf: add MCP perf 1

- [x] 6.12 C5: MCP perf 2 — world-model BFS 100/1K/10K nodes
  What: benchmarks/perf-mcp-2.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-2.md
  Commit: Y | perf: add MCP perf 2

- [x] 6.13 C5: MCP perf 3 — reward-system score_action latency
  What: benchmarks/perf-mcp-3.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-3.md
  Commit: Y | perf: add MCP perf 3

- [x] 6.14 C5: MCP perf 4 — tool-tracker track_tool_use latency
  What: benchmarks/perf-mcp-4.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-4.md
  Commit: Y | perf: add MCP perf 4

- [x] 6.15 C5: MCP perf 5 — all 8 MCP cold start time
  What: benchmarks/perf-mcp-5.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-5.md
  Commit: Y | perf: add MCP perf 5

- [x] 6.16 C5: MCP perf 6 — all 8 MCP concurrent throughput
  What: benchmarks/perf-mcp-6.bench.js.
  Parallelization: W6 (manual) | Blocked: W4 | Blocks: nothing
  Refs: all MCP server.ts files
  Accept: outputs P50/P95/P99
  QA: Happy — memory-store 10K ops < 500ms. Failure — > 5s
  Evidence: .omo/evidence/c5-perf-mcp-6.md
  Commit: Y | perf: add MCP perf 6

- [x] 6.17 C5: Stress test 1 — memory-store 100K records memory+time
  What: benchmarks/perf-stress-1.bench.js.
  Parallelization: W6 (manual) | Blocked: W4/W5 | Blocks: nothing
  Accept: completes without crash, within memory bounds
  QA: Happy — 500 sessions all correct signals. Failure — OOM or crash
  Evidence: .omo/evidence/c5-perf-stress-1.md
  Commit: Y | perf: add stress test 1

- [x] 6.18 C5: Stress test 2 — signal computation 500 concurrent sessions
  What: benchmarks/perf-stress-2.bench.js.
  Parallelization: W6 (manual) | Blocked: W4/W5 | Blocks: nothing
  Accept: completes without crash, within memory bounds
  QA: Happy — 500 sessions all correct signals. Failure — OOM or crash
  Evidence: .omo/evidence/c5-perf-stress-2.md
  Commit: Y | perf: add stress test 2

- [x] 6.19 C5: Stress test 3 — all 8 MCPs simultaneous 100 requests each
  What: benchmarks/perf-stress-3.bench.js.
  Parallelization: W6 (manual) | Blocked: W4/W5 | Blocks: nothing
  Accept: completes without crash, within memory bounds
  QA: Happy — 500 sessions all correct signals. Failure — OOM or crash
  Evidence: .omo/evidence/c5-perf-stress-3.md
  Commit: Y | perf: add stress test 3

- [x] 6.20 C5: Stress test 4 — hook injection 10K consecutive cycles
  What: benchmarks/perf-stress-4.bench.js.
  Parallelization: W6 (manual) | Blocked: W4/W5 | Blocks: nothing
  Accept: completes without crash, within memory bounds
  QA: Happy — 500 sessions all correct signals. Failure — OOM or crash
  Evidence: .omo/evidence/c5-perf-stress-4.md
  Commit: Y | perf: add stress test 4

- [x] 6.21 C13e: Plugin lifecycle-t4-seq
  What: tests/behavioral/agentest/scenarios/c13-lifecycle-t4-seq.sim.ts. T4 event sequence: idle→error→idle→consolidation via Agentest multi-turn.
  Assert: all 4 T4 events processed in order.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-lifecycle-t4-seq.md
  Commit: Y | test(runtime): add Agentest lifecycle-t4-seq

- [x] 6.22 C13e: Plugin lifecycle-warnings
  What: tests/behavioral/agentest/scenarios/c13-lifecycle-warnings.sim.ts. G2/G4/G6 warning messages appended to output.
  Assert: mechanism data has 'SAFETY GATES' entries.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-lifecycle-warnings.md
  Commit: Y | test(runtime): add Agentest lifecycle-warnings

- [x] 6.23 C13e: Plugin lifecycle-audit
  What: tests/behavioral/agentest/scenarios/c13-lifecycle-audit.sim.ts. full audit trail: every tool call logged with timestamp.
  Assert: audit records match tool call count.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-lifecycle-audit.md
  Commit: Y | test(runtime): add Agentest lifecycle-audit

- [x] 6.24 C13f: recovery-mcp-disconnect
  What: tests/behavioral/agentest/scenarios/c13-recovery-mcp-disconnect.sim.ts.
  MCP server disconnects, handler reconnects gracefully.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-mcp-disconnect.md
  Commit: Y | test(runtime): add Agentest recovery-mcp-disconnect

- [x] 6.25 C13f: recovery-unhandled-exception
  What: tests/behavioral/agentest/scenarios/c13-recovery-unhandled-exception.sim.ts.
  plugin throws unhandled exception, caught and logged.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-unhandled-exception.md
  Commit: Y | test(runtime): add Agentest recovery-unhandled-exception

- [x] 6.26 C13f: recovery-mt-corruption
  What: tests/behavioral/agentest/scenarios/c13-recovery-mt-corruption.sim.ts.
  M_t state corrupted, auto-repair to defaults.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-mt-corruption.md
  Commit: Y | test(runtime): add Agentest recovery-mt-corruption

- [x] 6.27 C13f: recovery-concurrent-timeout
  What: tests/behavioral/agentest/scenarios/c13-recovery-concurrent-timeout.sim.ts.
  one session times out, others unaffected.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-concurrent-timeout.md
  Commit: Y | test(runtime): add Agentest recovery-concurrent-timeout

- [x] 6.28 C13f: recovery-oom-simulation
  What: tests/behavioral/agentest/scenarios/c13-recovery-oom-simulation.sim.ts.
  OOM condition, safety_level raised.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-oom-simulation.md
  Commit: Y | test(runtime): add Agentest recovery-oom-simulation

- [x] 6.29 C13f: recovery-cascade-failure
  What: tests/behavioral/agentest/scenarios/c13-recovery-cascade-failure.sim.ts.
  memory MCP down, world-model still works independently.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: src/plugin/brain-hooks.mjs, brain-plugin.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-recovery-cascade-failure.md
  Commit: Y | test(runtime): add Agentest recovery-cascade-failure

- [x] 6.30 C13g: demand-fix-login
  What: tests/behavioral/agentest/scenarios/c13-demand-fix-login.sim.ts.
  fix login bug → verify handler records URGENT mood + memory search trigger.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-demand-fix-login.md
  Commit: Y | test(runtime): add Agentest demand-fix-login

- [x] 6.31 C13g: demand-create-api
  What: tests/behavioral/agentest/scenarios/c13-demand-create-api.sim.ts.
  create new API endpoint → verify L3 swarm detection triggered.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-demand-create-api.md
  Commit: Y | test(runtime): add Agentest demand-create-api

- [x] 6.32 C13g: demand-delete-file
  What: tests/behavioral/agentest/scenarios/c13-demand-delete-file.sim.ts.
  delete that file → verify safety-cortex G1-G7 pattern matching active.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-demand-delete-file.md
  Commit: Y | test(runtime): add Agentest demand-delete-file

- [x] 6.33 C13g: demand-what-did-i-do
  What: tests/behavioral/agentest/scenarios/c13-demand-what-did-i-do.sim.ts.
  what did I do last week → verify hippocampus episodic memory retrieval.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: .opencode/skills/brain-master.md
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-demand-what-did-i-do.md
  Commit: Y | test(runtime): add Agentest demand-what-did-i-do

- [x] 6.34 C13g: protocol-invalid-config
  What: tests/behavioral/agentest/scenarios/c13-protocol-invalid-config.sim.ts.
  handler receives invalid config → graceful error.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: tests/agentest-handler.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-protocol-invalid-config.md
  Commit: Y | test(runtime): add Agentest protocol-invalid-config

- [x] 6.35 C13g: protocol-null-message
  What: tests/behavioral/agentest/scenarios/c13-protocol-null-message.sim.ts.
  handler receives null/undefined/empty → no crash.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: tests/agentest-handler.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-protocol-null-message.md
  Commit: Y | test(runtime): add Agentest protocol-null-message

- [x] 6.36 C13g: protocol-rapid-100
  What: tests/behavioral/agentest/scenarios/c13-protocol-rapid-100.sim.ts.
  100 rapid messages without awaiting response → all processed.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: tests/agentest-handler.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-protocol-rapid-100.md
  Commit: Y | test(runtime): add Agentest protocol-rapid-100

- [x] 6.37 C13g: protocol-mixed-calls
  What: tests/behavioral/agentest/scenarios/c13-protocol-mixed-calls.sim.ts.
  mixed user messages + simulateToolCall → correct state.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: tests/agentest-handler.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-protocol-mixed-calls.md
  Commit: Y | test(runtime): add Agentest protocol-mixed-calls

- [x] 6.38 C13g: protocol-reuse-after-close
  What: tests/behavioral/agentest/scenarios/c13-protocol-reuse-after-close.sim.ts.
  handler reuse after session close → new session created.
  Parallelization: W6 (manual) | Blocked: W0 | Blocks: nothing
  Refs: tests/agentest-handler.mjs
  Accept: npx agentest run passes
  Evidence: .omo/evidence/c13-protocol-reuse-after-close.md
  Commit: Y | test(runtime): add Agentest protocol-reuse-after-close



## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE.
- [x] F1. Plan compliance — all todos completed, all evidence in .omo/evidence/
- [x] F2. Code quality — no eval, no process.exit, all imports resolvable
- [x] F3. Real QA — `node tests/runner.js --all --runtime`, 100% PASS
- [x] F4. Scope fidelity — git diff shows only new files, no existing modified
- [x] F5. Coverage gap audit — every brain-agent source file has at least 1 test

## Commit strategy
- 7 commits, one per wave (W0-W6)
- Format: test|<perf>|<feat>(<scope>): add <component> (<count>)
- W6: `feat(bench): add SWE-bench Lite evaluation (6)`

## Success criteria
- [x] All todos completed with [x]
- [x] All evidence files in .omo/evidence/ with PASS status
- [x] `node tests/runner.js --all` passes (existing tests unbroken)
- [x] All 21 components (C1-C21) all have at least 1 passing test, ~299 total tests across 7 waves (Agentest scenarios each count as 1 todo but produce 3+ assertions)
- [x] Expanded agentest-handler.mjs handles all 15 user scenarios (C13b)
- [x] All 8 MCP servers have protocol/persistence/concurrency coverage
- [x] All 7 signals tested in isolation + all 21 cross-product pairs (C2)
- [x] All 7 safety gates tested against 5 bypass vectors each = 35 gate tests (C3)
- [x] 3 cross-circuit conflict rules verified active
- [x] 50 Agentest simulation scenarios pass (C13) + SWE-bench Lite 50-task baseline (C14) — each with 3+ deterministic mechanism assertions
- [x] No existing test files modified
- [x] SWE-bench pass@1 >= 10% baseline
