# brain-agent-circuit-completion - Work Plan

## TL;DR (For humans)

**What you'll get:** 大脑完全对齐 Foundation Agent 论文 arXiv 2504.01990 — 新增 6 条核心回路（学习反馈、世界模型预测、奖励→注意力、L2 竞争门控、体内平衡、OODA 闭环）+ 全局共享状态（GLOBAL_STATE 所有回路 read/write）+ 3 条传播扩展（情绪→全层、人格→L3/Post、安全持续监视）+ 共享注意力预算。全部在 brain-master.md 中 ~700 行完成，不改一行 MCP 代码。

**Why this approach:** 所有 wiring 只改 brain-master.md（编排器 prompt），因为 OMO 不支持按 category 注入上下文，路由信号必须在 orchestrator 层完成。冲突分析确认 3 组竞争关系（D-K: 预算上限胜于奖励提升; B-J: 安全优先于学习; H-I: 人格基线 + 情绪偏移）都已设计仲裁规则。

**What it will NOT do:** 不改 MCP 服务器代码（src/mcp/*/），不改 20 个 agent .md 文件，不添加新 npm 依赖，不加 UI/仪表盘，不改 install.js 或配置文件。

**Effort:** Medium — 11 个 wiring 变更 + 测试文件 + README + boulder，全在 brain-master.md (~700 行)
**Risk:** Low — 只改 orchestrator prompt 伪代码，不改生产代码。冲突仲裁规则已在计划中明确
**Decisions to sanity-check:** D-K 预算上限优先级、H-I 人格+情绪组合规则、B-J 安全冻结学习

Your next move: approve to start execution — all 8 waves will execute sequentially by the worker.

---

> TL;DR (machine): Medium effort, Low risk — 11 wiring changes + 13 test files + README + boulder, brain-master.md 570→~700 lines. 8 waves: S(shared state) → A(infra+tests) → B(health+competition) → C(spread) → D(predict) → E(learn) → F(OODA) → G(verify)

## Scope
### Must have
- Shared Global State: centralized GLOBAL_STATE object read/written by ALL circuits (mood, reward, world_digest, safety_level, personality, attention_budget)
- Bidirectional circuit communication: L2/L3/Post results feed back into shared state → next L1 cycle reads them
- Learning feedback loop: self-enhance reflexion → hippocampus → next L1 cycle
- World model predict→act→verify loop: world_predict → plan → act → world_diff → update model
- Reward→attention modulation: reward-cortex.score → attention-cortex threshold bias (within attention budget cap)
- L2 Gates Winner-Take-Most: competition scoring instead of parallel-fire-all (sorted by gate_score, top-N execute)
- Homeostasis circuit: monitor.alert → insula → corrective action
- Full OODA loop closure: world_update → next L1 perceives change → adjusted perception
- Mood→all layers propagation: L1.5 mood flows to L1, L2, L3, Post explicitly
- Personality→L3/Post: O/C/E/N/A traits injected into swarm and post-action prompts
- Safety as continuous monitor: safety-cortex runs in background, not just conditional L2 gate
- Shared Attention Budget: capacity cap that constrains WTM selection (budget wins over reward boost)
- README update: all new circuits, 8 MCP list, 43/43 paper alignment, circuit table
- 13 test files: 11 circuit tests + 1 integration + 1 strategy doc in tests/
- Boulder.json: mark completed

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO changes to MCP server code (src/mcp/*/)
- NO changes to agent .md files (.opencode/prompts/brain/*.md)
- NO new npm dependencies
- NO UI/dashboard
- NO changes to install.js or config files
- NO changes to 20 agent YAML stubs (src/agents/*.md)
- NO runtime LLM calls for verification — all tests are static grep-based
- NO breaking existing L1/L2/L3 path — new circuits add sections, don't rewrite

## Verification strategy
> Zero human intervention - all verification is agent-executed. No LLM calls needed.
- Test decision: tests-after (grep-based static analysis of brain-master.md sections)
- Framework: node tests/runner.js --circuits + node tests/runner.js --integration
- Pattern: Each test reads brain-master.md via fs, asserts section presence via content.includes()/match()
- Evidence: .omo/evidence/task-<N>-brain-agent-circuit-completion.md (machine-parseable markdown)
- Baseline established: 1 PASS / 16 FAIL (only mood→all layers existing). Target: 17 PASS / 0 FAIL.

## Execution strategy
### Parallel execution waves (ordered — each wave depends on previous)
Wave S (Foundation): todo 0 — Shared Global State infrastructure
Wave A (Infrastructure): todos 1-3 — boulder + test files + README (parallelizable)
Wave B (L2 Coordination): todos 4-6 — Homeostasis → Safety monitor → Attention Budget (order-sensitive)
Wave C (L2 Competition): todos 7-8 — WTM → Reward→Attention (must be after budget)
Wave D (Propagation): todos 9-10 — Mood→all layers → Personality→L3/Post (must be after shared state)
Wave E (Prediction): todo 11 — World model predict→verify (after shared state + reward)
Wave F (Learning): todo 12 — Learning feedback loop (after prediction)
Wave G (Closure): todo 13 — OODA loop closure (after learning)
Wave H (Verification): todo 14 — Full plan compliance + quality review

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 0 (global state) | — | 4-13 | 1,2,3 |
| 1 (boulder) | — | — | 0,2,3 |
| 2 (test files) | — | — | 0,1,3 |
| 3 (README) | — | — | 0,1,2 |
| 4 (homeostasis) | 0 | — | 5,6 |
| 5 (safety monitor) | 0 | — | 4,6 |
| 6 (attention budget) | 0 | 7,8 | 4,5 |
| 7 (WTM) | 0,6 | 8 | — |
| 8 (reward→attention) | 0,6,7 | 11 | — |
| 9 (mood→all) | 0 | 10,12 | 4,5,6 |
| 10 (personality→L3) | 0,9 | — | 4,5,6 |
| 11 (world predict) | 0,6,8 | 12 | 9,10 |
| 12 (learning loop) | 0,6,8,11 | 13 | 9,10 |
| 13 (OODA) | 0,6,8,11,12 | — | — |
| 14 (verify) | 0-13 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
WAVE S:

- [ ] 0. Add SHARED GLOBAL STATE infrastructure + bidirectional circuit communication + conflict resolution rules
  What to do: Edit `brain-master.md` —
    1. After CORE RULE, add `## SHARED STATE` section declaring:
       ```
       GLOBAL_STATE = {
         mood: current_mood,            // from L1.5
         reward: {score: 0-10},          // from reward-cortex
         world_digest: ["changed_file1"], // from world-update
         safety_level: "normal",          // from safety-cortex
         personality: personality_traits,  // personality (O/C/E/N/A)
         attention_budget: 1.0            // 0-1 remaining capacity
       }
       ```
    2. At the end of each phase (L1 Step 5, L1.5 Step 4, L2 collect, L3 Step 4, POST-ACTION Step 4), add:
       `GLOBAL_STATE.<field> = <new_value>` to write results back
    3. At the START of L1 (before Step 1), add:
       `// Read GLOBAL_STATE from memory-store for current cycle context`
       `GLOBAL_STATE = memory_store.get("global_state")`
    4. In CIRCUIT CONNECTION REFERENCE, add a `Feedback` column or add rows showing bidirectional connections (e.g., reward-cortex → GLOBAL_STATE → amygdala, safety-cortex → GLOBAL_STATE → world-cortex)
    5. In L1_CONTEXT, add `global_state: GLOBAL_STATE` so all downstream agents can read shared signals
    6. Add `[GLOBAL: mood:<mode> reward:<score> safety:<level> budget:<remaining>]` to STATUS DISPLAY
    7. Add conflict resolution rules block in SHARED STATE section:
       - (D-K) attention_budget is outer cap — reward modulation operates within remaining budget
       - (B-J) safety_level=CAUTION freezes all trait drift; learning loop pauses
       - (H-I) threshold = personality_base + mood_offset, clamped [0.0, 1.0]
  Must NOT do: Do NOT remove any existing sections. Do NOT duplicate fields already in L1_CONTEXT — use GLOBAL_STATE as the persistence layer.
  Parallelization: Wave S | Blocked by: (none) | Blocks: todos 4-13 | Parallel with: 1,2,3
  References: brain-master.md CORE RULE (lines 1-8), L1 Step 5 (lines 119-138), L1.5 Step 4 (lines 188-195), L2 collect (lines 236-245), L3 Step 4 (lines 301-309), POST-ACTION Step 4 (lines 369-373), CIRCUIT CONNECTION REFERENCE (lines 446-470), STATUS DISPLAY (lines 425-432)
  Acceptance criteria: brain-master.md has SHARED STATE section with structured GLOBAL_STATE. L1 starts with `GLOBAL_STATE = memory_store.get("global_state")`. Each phase writes back to GLOBAL_STATE. CIRCUIT CONNECTION REFERENCE has bidirectional rows. STATUS DISPLAY has [GLOBAL:] line. 3 conflict rules documented.
  QA: Read brain-master.md — verify SHARED STATE section, L1 read step, 5+ write-back points, STATUS line, conflict rules. Evidence: .omo/evidence/task-0-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add SHARED GLOBAL STATE with conflict resolution rules

WAVE A:

- [ ] 1. Close Boulder state
  What to do: Edit `.omo/boulder.json` — change `"status": "active"` to `"status": "completed"`.
  Must NOT do: Do NOT delete boulder.json. Do NOT touch any other fields.
  Parallelization: Wave A | Blocked by: (none) | Blocks: (none) | Parallel with: 0,2,3
  References: .omo/boulder.json:1-14
  Acceptance criteria: boulder.json has `"status": "completed"`.
  QA: Read .omo/boulder.json — verify status field changed. Evidence: .omo/evidence/task-1-brain-agent-circuit-completion.md
  Commit: N (trivial infra)

- [ ] 2. Create 13 circuit test files + evidence dir
  What to do: Verify tests/circuits/circuit-*.test.js (11 files), tests/integration/circuit-coexistence.test.js (1), tests/TESTING_STRATEGY.md (1) exist — all already drafted. Create .omo/evidence/ directory with .gitkeep. Run baseline: `node tests/runner.js --circuits --integration` and record output.
  Must NOT do: Do NOT create new test files beyond the 13 already drafted. Do NOT run LLM for verification.
  Parallelization: Wave A | Blocked by: (none) | Blocks: (none) | Parallel with: 0,1,3
  References: tests/circuits/*.test.js, tests/integration/circuit-coexistence.test.js, tests/TESTING_STRATEGY.md
  Acceptance criteria: 13 files exist, evidence dir exists, baseline run returns expected 1 PASS / 16 FAIL.
  QA: Glob for test files, read evidence output. Evidence: .omo/evidence/task-2-brain-agent-circuit-completion.md
  Commit: Y | test: add 13 circuit test files for new wiring (baseline: 1/17 pass)

- [ ] 3. Update README with all new circuits
  What to do: Edit `README.md` to add: Shared Global State, Learning Feedback, World Predict→Verify, Reward→Attention, WTM, Homeostasis, OODA, Mood→All, Personality→L3/Post, Safety Continuous, Attention Budget. Update architecture diagram, paper alignment to 43/43, MCP list (8 servers), circuit table.
  Must NOT do: Do NOT remove any existing content. Do NOT change README format/style.
  Parallelization: Wave A | Blocked by: (none) | Blocks: (none) | Parallel with: 0,1,2
  References: Current README.md, brain-master.md
  Acceptance criteria: README has all 11 new circuit descriptions.
  QA: Read README.md — verify all new sections present. Evidence: .omo/evidence/task-3-brain-agent-circuit-completion.md
  Commit: Y | docs: add all 11 new circuits and attention budget to README

WAVE B:

- [ ] 4. Add Homeostasis circuit (monitor→insula→corrective action)
  What to do: Edit `brain-master.md` — add insula trigger row to L2 gate table, add Homeostasis Response section after L2 gates with corrective action logic (reduce parallel load, increase safety threshold, log to monitor), update STATUS DISPLAY with [HOMEOSTASIS:] line.
  Must NOT do: Do NOT add auto-shutdown or destructive corrective actions.
  Parallelization: Wave B | Blocked by: todo 0 | Blocks: (none) | Parallel with: 5,6
  References: brain-master.md L2 gate table (lines 208-219), STATUS DISPLAY (lines 425-432)
  Acceptance criteria: L2 gate table has insula trigger row. Homeostasis Response section exists with corrective logic. [HOMEOSTASIS:] in status.
  QA: Read brain-master.md — verify gate row, homeostasis section, status display. Evidence: .omo/evidence/task-4-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add homeostasis circuit (monitor→insula→corrective)

- [ ] 5. Add Safety as continuous monitor (background, not just L2 gate)
  What to do: Edit `brain-master.md` — add background safety monitoring step in L1 Step 1 (parallel safety check on every message), add safety_status field to GLOBAL_STATE, add safety badge to STATUS DISPLAY.
  Must NOT do: Do NOT remove existing L2 conditional safety gate — both coexist.
  Parallelization: Wave B | Blocked by: todo 0 | Blocks: (none) | Parallel with: 4,6
  References: brain-master.md L1 Step 1 (lines 13-26), L2 gate table (lines 208-219), STATUS DISPLAY
  Acceptance criteria: L1 has background safety check, GLOBAL_STATE has safety_status, status shows badge.
  QA: Read brain-master.md — verify L1 safety step, GLOBAL_STATE update, status badge. Evidence: .omo/evidence/task-5-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add continuous safety monitor (background, not just L2 gate)

- [ ] 6. Add Shared Attention Budget as outer constraint
  What to do: Edit `brain-master.md` — add attention_budget: 1.0 field to GLOBAL_STATE, add budget allocation logic (each L2 gate fire consumes gate_weight / total_weight), add budget check before L2 gate firing (skip if budget < threshold), add budget tracking line to STATUS DISPLAY. Document D-K conflict rule: budget cap > reward modulation boost.
  Must NOT do: Do NOT make budget the only selector — WTA still applies within budget.
  Parallelization: Wave B | Blocked by: todo 0 | Blocks: 7,8 | Parallel with: 4,5
  References: GLOBAL_STATE (todo 0 insert), L2 gate table (lines 208-219), L2 prompt template (lines 221-234)
  Acceptance criteria: attention_budget in GLOBAL_STATE, budget logic in L2, budget in status, D-K rule documented.
  QA: Read brain-master.md — verify GLOBAL_STATE field, L2 budget check, status line, conflict rule. Evidence: .omo/evidence/task-6-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add shared attention budget as outer constraint on L2 firing

WAVE C:

- [ ] 7. Add Winner-Take-Most competition to L2 gates
  What to do: Edit `brain-master.md` — after L2 gate table, insert Gate Competition section with WTA scoring formula: gate_score = urgency*0.4 + reward_bias*0.3 + safety_priority*0.3, sort gates descending, execute top-2 (limited by attention budget), update STATUS DISPLAY to show scores.
  Must NOT do: WTA orders/limits but doesn't permanently exclude — all gates remain configured.
  Parallelization: Wave C | Blocked by: 0,6 | Blocks: 8 | Parallel with: (none)
  References: brain-master.md L2 gate table (lines 208-219), L2 collect results (lines 236-245), STATUS DISPLAY (lines 425-432)
  Acceptance criteria: WTA section exists between gate table and prompt template. Top-2 + score display documented. Budget limit referenced.
  QA: Read brain-master.md — verify WTA section, scores in status, budget limit noted. Evidence: .omo/evidence/task-7-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add WTA competition with budget-constrained top-N execution

- [ ] 8. Wire Reward→Attention Modulation (within budget cap)
  What to do: Edit `brain-master.md` — in L1.5 Step 4: add `attention_priority_bias = clamp(avg_reward_score * 0.3, 0, 0.5)`, in L2 gate table: add reward-cortex.score > 6 as trigger, in WTA scoring: reward_bias = attention_priority_bias. Document: budget cap is outer constraint — reward boost cannot exceed remaining budget.
  Must NOT do: Do NOT remove existing L2 gate conditions. Do NOT make reward the sole gate selector.
  Parallelization: Wave C | Blocked by: 0,6,7 | Blocks: 11 | Parallel with: (none)
  References: brain-master.md L1.5 Step 4 (lines 188-195), L2 gate table (lines 208-219), WTA section (todo 7)
  Acceptance criteria: attention_priority_bias formula in L1.5, reward trigger in gate table, budget cap documented in WTA.
  QA: Read brain-master.md — verify L1.5 formula, gate table trigger, budget cap note. Evidence: .omo/evidence/task-8-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add reward→attention modulation within budget constraint

WAVE D:

- [ ] 9. Extend Mood→All Layers propagation
  What to do: Edit `brain-master.md` — in L1: add mood context to L1_CONTEXT and L1 agent prompts, in L1.5: extend mood propagation beyond L2 to also flow to L3 and Post, in L3 Step 1 (planner): inject current mood into swarm-plan prompt, in Post Step 1 (self-enhance): inject mood for context-aware reflection. Document H-I conflict rule: threshold = personality_base + mood_offset, clamped [0.0, 1.0].
  Must NOT do: Do NOT change existing L1.5→L2 mood link — only extend it.
  Parallelization: Wave D | Blocked by: 0 | Blocks: 10,12 | Parallel with: 4,5,6
  References: brain-master.md L1 Step 5 (lines 119-138), L1.5 Step 4 (lines 188-195), L3 Step 1 (lines 261-268), POST Step 1 (lines 332-339)
  Acceptance criteria: mood referenced in L1, L1.5→L3 link, mood in L3 planner, mood in Post, H-I conflict rule documented.
  QA: Read brain-master.md — verify 4 mood injection points + conflict rule. Evidence: .omo/evidence/task-9-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): extend mood propagation from L2 to ALL layers (L1, L3, Post)

- [ ] 10. Extend Personality→L3/Post propagation
  What to do: Edit `brain-master.md` — in L3 Step 1 (planner prompt): append personality context (O/C/E/N/A bias swarm speed/rigor), in Post Step 1 (self-enhance prompt): append personality context (traits bias reflection depth), in Post Step 5 (DMN): verify personality already used in trait drift — ensure continued.
  Must NOT do: Do NOT change personality drift rates — only propagate existing values.
  Parallelization: Wave D | Blocked by: 0,9 | Blocks: (none) | Parallel with: 4,5,6
  References: brain-master.md L3 Step 1 (lines 261-268), POST Step 1 (lines 332-339), DMN (lines 387-417), Personality (lines 473-550)
  Acceptance criteria: personality in L3 planner prompt, personality in Post self-enhance prompt, DMN still correct.
  QA: Read brain-master.md — verify L3 prompt, Post prompt, DMN section. Evidence: .omo/evidence/task-10-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): extend personality propagation to L3 swarm and Post-action prompts

WAVE E:

- [ ] 11. Add World Model Predict→Verify cycle
  What to do: Edit `brain-master.md` — in L3 between Step 1 (planner) and Step 2 (coder): insert Step 1b with world_predict (before implementing), in POST-ACTION Step 4: add world_diff after world_update to verify prediction accuracy, store prediction accuracy in GLOBAL_STATE.reward for downstream reward→attention circuit.
  Must NOT do: world_predict is advisory, not blocking — does not gate L3 coder.
  Parallelization: Wave E | Blocked by: 0,6,8 | Blocks: 12 | Parallel with: 9,10
  References: brain-master.md L3 swarm pipeline (lines 249-266), POST-ACTION Step 4 (lines 369-373), GLOBAL_STATE (todo 0)
  Acceptance criteria: L3 Step 1b with world_predict, POST has world_diff, accuracy stored in GLOBAL_STATE.
  QA: Read brain-master.md — verify Step 1b, POST world_diff, GLOBAL_STATE.reward update. Evidence: .omo/evidence/task-11-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add world model predict→act→verify cycle

WAVE F:

- [ ] 12. Add Learning Feedback Loop with CAUTION-mode freeze
  What to do: Edit `brain-master.md` — in POST-ACTION Step 1b: tag reflexion lessons as 'recent_lesson' with TTL=1 session, in L1 Step 1 (hippocampus): add recent_lessons to retrieval query, in L1 Step 5 (L1_CONTEXT): add recent_lessons field, in STATUS DISPLAY: add [LEARN: feedback✓] line, in GLOBAL_STATE: add learning_feedback field. Document B-J conflict rule: when safety_level=CAUTION, learning loop pauses all trait drift.
  Must NOT do: Do NOT modify any existing L1/L2/L3 steps. Only add to POST-ACTION and append to L1_CONTEXT.
  Parallelization: Wave F | Blocked by: 0,6,8,11 | Blocks: 13 | Parallel with: 9,10
  References: brain-master.md POST Step 1 (lines 332-339), L1 Step 1 (lines 13-26), L1 Step 5 (lines 119-138), STATUS DISPLAY
  Acceptance criteria: recent_lessons tagged in POST, hippocampus queries them, L1_CONTEXT has them, [LEARN:] in status, B-J conflict rule documented.
  QA: Read brain-master.md — verify POST tag, L1 retrieval, context field, status line, conflict rule. Evidence: .omo/evidence/task-12-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): add learning feedback loop with CAUTION-mode freeze rule

WAVE G:

- [ ] 13. Close OODA Loop (act→world→next cycle perceives change)
  What to do: Edit `brain-master.md` — add OODA loop docstring to CORE RULE section, in L1 Step 1b: inject previous cycle's world_update result into world-cortex prompt, in CIRCUIT CONNECTION REFERENCE: add world-update→world-cortex row showing bidirectional connection, update STATUS DISPLAY to show cycle count.
  Must NOT do: Do NOT add new MCP calls. Do NOT change existing cycle sequence.
  Parallelization: Wave G | Blocked by: 0,6,8,11,12 | Blocks: (none) | Parallel with: (none)
  References: brain-master.md CORE RULE (lines 1-8), L1 Step 1 (lines 13-26), CIRCUIT CONNECTION REFERENCE (lines 446-470), STATUS DISPLAY
  Acceptance criteria: OODA docstring in CORE RULE, L1 Step 1b with world_update injection, feedback row in circuit table, cycle count in status.
  QA: Read brain-master.md — verify docstring, L1 Step 1b, circuit table row, status. Evidence: .omo/evidence/task-13-brain-agent-circuit-completion.md
  Commit: Y | feat(wiring): close OODA loop (act→world→next cycle perceives change)

WAVE H:

- [ ] 14. Full plan compliance + quality review
  What to do: Run `node tests/runner.js --circuits --integration`, verify ALL 13 tests pass (target: 17/17 PASS, 0 FAIL), verify README covers all 11 circuits, verify boulder.json status, grep for TODO/FIXME/HACK in changed files, verify only brain-master.md + README.md + boulder.json + tests/*.test.js + .omo/evidence/*.md changed, read evidence files in .omo/evidence/ — all should show PASS.
  Must NOT do: Do NOT mark checks as passed unless verified.
  Parallelization: Wave H | Blocked by: todos 0-13 | Blocks: (none) | Parallel with: (none)
  Acceptance criteria: circuit tests 17/17 pass, integration tests pass, no TODOs in changed files, scope fidelity confirmed.
  QA: Run test suite, grep for patterns, read evidence files. Evidence: .omo/evidence/task-14-brain-agent-circuit-completion.md
  Commit: N (verification only)

## Final verification wave
> Runs after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — ALL 15 todos complete as specified
- [ ] F2. Test pass audit — node tests/runner.js --circuits --integration returns 17/17 PASS
- [ ] F3. Code quality review — no TODOs, FIXMEs, HACKs in changed files
- [ ] F4. Scope fidelity — only brain-master.md + README.md + boulder.json changed (+ test files + evidence)

## Commit strategy
- 14 commits: 0=global state, 2=test files, 3=README, 4=homeostasis, 5=safety, 6=budget, 7=WTM, 8=reward→attention, 9=mood→all, 10=personality→L3, 11=world predict, 12=learning, 13=OODA
- (todo 1=boulder has no commit, todo 14=verify has no commit)
- Conventional commits: feat(wiring): for circuit additions, test: for test files, docs: for README
- All circuit changes land in the same file (brain-master.md) so they commit sequentially
- Each commit only touches brain-master.md + optionally test files

## Success criteria
1. brain-master.md has all 14 new sections: GLOBAL_STATE (1) + homeostasis (1) + safety monitor (1) + attention budget (1) + WTM (1) + reward→attention (1) + mood→all (1) + personality→L3 (1) + world predict (1) + learning (1) + OODA (1) = 11 new sections
2. brain-master.md grows from 570 to ~700 lines
3. node tests/runner.js --circuits --integration returns 17/17 PASS, 0 FAIL
4. README covers all 11 new circuits + MCP list + 43/43 paper alignment
5. 3 conflict resolution rules documented in GLOBAL_STATE section (D-K, B-J, H-I)
6. Boulder.json marked completed
7. Only brain-master.md, README.md, boulder.json, tests/*.test.js, .omo/evidence/*.md changed
