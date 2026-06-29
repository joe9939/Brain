# brain-agent-full-paper-alignment - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** All 32 tests passing, MCP code using paper formulas (retrieval weighting, hybrid search), hooks implementing temporal derivative learning, three new papers (Neocortex Learning, Brain-AI Alignment, NeuroVLA) applied to brain-agent code.

**Why this approach:** Incremental â€?fix tests first (quick wins), then MCP code (core formulas), then hooks (new papers), verifying at each stage with `node tests/runner.js --all`.

**What it will NOT do:** NOT change any .md documentation files (already done). NOT modify the OMO plugin or auth config. NOT add new MCP servers or new features.

**Effort:** Medium â€?4 phases, ~1h total
**Risk:** Low â€?changes are targeted code fixes with test verification per phase
**Decisions to sanity-check:** Temporal derivative formula coefficients (0.3/0.3/0.4 default weights)

---

> TL;DR (machine): <1 line - effort, risk, deliverables>

## Scope
### Must have
### Must NOT have (guardrails, anti-slop, scope boundaries)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: <TDD | tests-after | none> + framework
- Evidence: .omo/evidence/task-<N>-brain-agent-full-paper-alignment.<ext>

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave A: Fix Tests
- [x] 1. Fix test naming + syntax errors
  What to do: Fix 4 test files: (1) circuit-coexistence.test.js â†?corrupted arrow char, GLOBAL_STATEâ†’MENTAL_STATE; (2) circuit-global-state.test.js â†?MENTAL_STATE naming; (3) circuit-ooda-loop.test.js + full-pathway.test.js â†?use 'CONDITIONAL GATES' string; (4) circuit-winner-take-most.test.js â†?slice(0,3)â†’slice(0,4). Run `node tests/runner.js --all` â†?32/32 PASS.
  Must NOT do: Do NOT change test logic, only naming/typo fixes.
  References: tests/circuits/*.test.js, tests/integration/*.test.js, tests/qc/*.test.js
  Acceptance criteria: `node tests/runner.js --all` exits with "PASS: 32, FAIL: 0, TOTAL: 32"
  QA: Run test suite, check all 4 categories pass. Evidence: .omo/evidence/task-1-brain-agent-full-paper-alignment.md
  Commit: Y | fix(tests): align test naming with MENTAL_STATE rename, fix syntax errors

### Wave B: Update MCP Code with Paper Formulas
- [x] 2. Update memory-store MCP hybrid search formula
  What to do: Edit `src/mcp/memory-store/src/store.ts` line 230: replace `r.score = kwScore; // simplified hybrid` with paper formula: `score = 0.3 * normalized_recency + 0.3 * importance + 0.4 * cosine_similarity`. Compute cosine_similarity from embedding if available, fall back to keyword score. Normalize recency as 1/(days_old+1).
  Must NOT do: Do NOT change existing keyword/vector/hybrid search modes. Do NOT break backward compatibility.
  References: D:\download\arXiv-2504.01990v2\files\2-Modular\2-2-memory.tex (retrieval weighting), src/mcp/memory-store/src/store.ts:210-237
  Acceptance criteria: `node --check src/mcp/memory-store/src/store.ts` passes. `node tests/runner.js --all` â†?32/32.
  QA: Check formula implemented correctly, fallback works without embeddings. Evidence: .omo/evidence/task-2-brain-agent-full-paper-alignment.md
  Commit: Y | feat(memory): implement paper retrieval weighting formula

- [x] 3. Update reward-system MCP intrinsic reward
  What to do: Edit `src/mcp/reward-system/src/scorer.ts` function computeIntrinsic(): add curiosity reward (novel actions), competence reward (improvement over baseline), diversity reward (variety of explored paths). Weights: curiosity=0.4, competence=0.3, diversity=0.3.
  Must NOT do: Do NOT change extrinsic scoring or UCB/TD implementations.
  References: D:\download\arXiv-2504.01990v2\files\2-Modular\2-4-reward.tex, src/mcp/reward-system/src/scorer.ts:136-143
  Acceptance criteria: `node --check src/mcp/reward-system/src/scorer.ts` passes. Tests 32/32.
  QA: Check intrinsic score includes curiosity+competence+diversity. Evidence: .omo/evidence/task-3-brain-agent-full-paper-alignment.md
  Commit: Y | feat(reward): implement intrinsic reward (curiosity/competence/diversity)

### Wave C: Apply Three New Papers to Code
- [x] 4. Add temporal derivative learning signal to brain-hooks.mjs
  What to do: Edit `src/plugin/brain-hooks.mjs` onToolAfter(): After each tool completion, compute temporal derivative = `prediction - outcome` as learning signal. Store in mental state `reward.td_error`. The prediction is the previous mental state's reward value; outcome is the actual result. This implements O'Reilly's "error-driven predictive learning via temporal derivatives" (arXiv 2606.08720).
  Must NOT do: Do NOT change existing hook behavior or G1-G7 safety gates.
  References: arXiv 2606.08720 (Neocortex Learning â€?temporal derivative model), src/plugin/brain-hooks.mjs:56-149
  Acceptance criteria: `node --check src/plugin/brain-hooks.mjs` passes. Tests 32/32.
  QA: Verify td_error computed in onToolAfter. Evidence: .omo/evidence/task-4-brain-agent-full-paper-alignment.md
  Commit: Y | feat(hooks): add temporal derivative learning signal from neocortex paper

- [x] 5. Update cerebellum.md with NeuroVLA tri-level architecture
  What to do: Edit `.opencode/prompts/brain/cerebellum.md` to add NeuroVLA-inspired tri-level action hierarchy: Cortex (planning) â†?Cerebellum (adaptive stabilization, temporal memory, error correction) â†?Spinal (fast reflex <20ms). Reference arXiv 2601.14628.
  Must NOT do: Do NOT change existing tool selection rules.
  References: arXiv 2601.14628 (NeuroVLA), .opencode/prompts/brain/cerebellum.md
  Acceptance criteria: cerebellum.md references tri-level architecture. Tests 32/32.
  QA: Read file â€?verify NeuroVLA concepts present. Evidence: .omo/evidence/task-5-brain-agent-full-paper-alignment.md
  Commit: Y | feat(cerebellum): add NeuroVLA tri-level architecture reference

### Wave D: Wire + Verify
- [x] 6. Final verification â€?all tests + E2E
  What to do: Verify all 32 tests pass, E2E tests pass, code parses. `node tests/runner.js --all`, `node tests/brain-e2e-runner.js`. Check all 8 MCP server files parse with `node --check`.
  Must NOT do: Do NOT modify any files â€?verification only.
  Acceptance criteria: 32/32 tests PASS. E2E all PASS. All MCP code parse OK.
  QA: Run full test suite and E2E. Evidence: .omo/evidence/task-6-brain-agent-full-paper-alignment.md
  Commit: N

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity

## Commit strategy

## Success criteria
