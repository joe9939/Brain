# brain-agent-paper-upgrade - Work Plan

## TL;DR (For humans)

**What you'll get:** brain-agent 升级到 v2.0。20 个人脑组件全部补齐 foundation-agent paper 的机制（HippoRAG 记忆检索、UCB-TD 强化学习、G1-G7 安全门、Reflexion 反思循环、SOP 匹配等），并且每个组件都定义了回路连接（谁抑制谁、谁反馈给谁、谁调制谁），真正实现「大脑连接组学」架构。

**Why this approach:** OMO 不提供按 category 注入上下文的能力，所以所有路由和上下文拼装都在 brain-master.md orchestrator 层完成。每个子 agent 通过 MCP 服务器获取数据，orchestrator 将数据格式化为子 agent 的 prompt 上下文。这样保持了 brain-master.md 作为「指挥」的单一职责，每个子 agent 保持 stateless 和 focused。

**What it will NOT do:** 不加 UI 仪表盘、不用 Python、不用云端 API（全本地 Ollama）、不用 OMO Team Mode、不改 agent 行为逻辑（只改文档和基础设施）。

**Effort:** XL — 25 个 todo，10 个 wave
**Risk:** Medium — 主要在 MCP 数据层，不影响核心 agent 行为
**Decisions to sanity-check:** 
- Ollama 跑本地 bge-small 嵌入（33MB，CPU，零成本）
- 安全 G1-G7 全在一个 plugin 文件
- 不使用 Team Mode，brain-master.md 手动路由
- 全 TypeScript，不用 Python MCP

Your next move: approve to start execution, or run a high-accuracy Momus review first.

---

> TL;DR (machine): XL effort, Medium risk — enhance 3 MCPs + create 5 new MCPs + expand plugin to G7 + rewrite 20 agent specs + rewrite orchestrator with brain-circuit patterns

## Scope
### Must have
- Enhanced memory-store MCP with Ollama vector embeddings + hybrid retrieval + episodic replay
- Enhanced world-model MCP with AST-level symbol extraction + impact analysis
- Enhanced reward-system MCP with UCB exploration bonus + TD learning + hierarchical scoring
- Brain-plugin.mjs expanded from L1 to full G1-G7 multi-level safety gates
- New tool-tracker MCP (cerebellum) with tool usage tracking + recommendation engine
- New SOP-tracker MCP (basal-ganglia) with regex/fuzzy SOP matching + Go/NoGo decision
- New reflexion-loop MCP (self-enhance) with structured post-task reflection + lesson extraction
- New priority-queue MCP (attention-cortex) with dependency-aware task prioritization
- New monitoring MCP (insula) with system event tracking + alert escalation
- Mood tracking in memory-store MCP (amygdala) with exponential decay
- All 20 brain agent .md files rewritten with circuit-aware template (TASK/INPUT/OUTPUT/DEPENDENCIES/CIRCUIT/RULES/QA)
- brain-master.md rewritten with feedback/inhibitory/modulatory circuit routing
- OMO ulw-loop wired for DMN/consolidation/hypothalamus periodic tasks
- Circuit connections: feedback loops (self-enhance→hippocampus), inhibitory paths (amygdala→thalamus), modulatory paths (reward→attention)

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO OMO Team Mode usage — all routing via brain-master.md
- NO Python MCP servers — TypeScript only
- NO cloud embedding dependencies — local Ollama only
- NO external SaaS monitoring — local MCP only
- NO UI/dashboard for brain status
- NO performance benchmarks (deferred to separate task)
- NO changes to agent behavior logic — only documentation (agent .md files) and infrastructure (MCPs, plugin)
- NO full HippoRAG implementation (no Pagerank indexing) — simplified hybrid retrieval only
- NO auto-apply for self-optimizer suggestions — orchestrator reviews first

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after for MCP servers (unit tests + integration), read-only verification for .md rewrites
- Framework: Node tap for MCPs, manual read/grep for agent spec files
- Evidence: .omo/evidence/task-<N>-brain-agent-paper-upgrade.md
- Each MCP must pass: `npm test` (unit), tool call smoke test (integration)
- Each .md rewrite must pass: section completeness check via grep

## Execution strategy
### Parallel execution waves
Wave 1 (Foundation): todos 1-3 — .md template + 20 agent specs + orchestrator (sequential chain)
Wave 2 (Memory): todos 4-6 — Ollama client + hybrid retrieval + episodic replay (sequential chain)
Wave 3 (Safety): todos 7-8 — G1-G7 plugin + safety-cortex.md (sequential chain)
Wave 4 (Tools): todos 9-10 — tool-tracker MCP + cerebellum.md (sequential chain)
Wave 5 (Reward): todos 11-13 — UCB bonus + TD learning + reward-cortex.md (sequential chain)
Wave 6 (World): todos 14-15 — AST symbols + world-cortex.md (sequential chain)
Wave 7 (SOP): todos 16-17 — SOP-tracker MCP + basal-ganglia.md (sequential chain)
Wave 8 (Reflexion): todos 18-19 — Reflexion MCP + self-enhance/optimizer.md (sequential chain)
Wave 9 (Attention+Periodic): todos 20-22 — priority-queue + ulw-loop + attention.md (partial chain)
Wave 10 (Monitor+Mood): todos 23-25 — monitor MCP + mood tracking + thalamus.md (parallelizable within wave)

INTER-WAVE PARALLELISM: Waves 2/3/4/5/6/10 are independent of each other and can run in parallel.
Wave 7 depends on Wave 2 (vector embedding). Wave 8 is independent. Wave 9 is independent.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 (.md template) | — | 2,3 | — |
| 2 (agent .md rewrites) | 1 | — | 3 (after 1) |
| 3 (brain-master.md) | 2 | — | — |
| 4 (Ollama client) | — | 5,6,16 | 1,7,9,11,14,18,20,23,24,25 |
| 5 (hybrid retrieval) | 4 | 6 | — |
| 6 (episodic replay) | 5 | — | — |
| 7 (G1-G7 plugin) | — | 8 | 1,4,9,11,14,18,20,23,24,25 |
| 8 (safety-cortex.md) | 7 | — | — |
| 9 (tool-tracker MCP) | — | 10 | 1,4,7,11,14,18,20,23,24,25 |
| 10 (cerebellum.md) | 9 | — | — |
| 11 (UCB bonus) | — | 12,13 | 1,4,7,9,14,18,20,23,24,25 |
| 12 (TD learning) | 11 | 13 | — |
| 13 (reward-cortex.md) | 11,12 | — | — |
| 14 (AST symbols) | — | 15 | 1,4,7,9,11,18,20,23,24,25 |
| 15 (world-cortex.md) | 14 | — | — |
| 16 (SOP-tracker MCP) | 4 | 17 | 7,9,11,14,18,20,23,24,25 |
| 17 (basal-ganglia.md) | 16 | — | — |
| 18 (Reflexion MCP) | — | 19 | 4,7,9,11,14,16,20,23,24,25 |
| 19 (self-enhance.md + optimizer.md) | 18 | — | — |
| 20 (priority-queue MCP) | — | 22 | 4,7,9,11,14,16,18,23,24,25 |
| 21 (ulw-loop config) | — | — | 4,7,9,11,14,16,18,20,23,24,25 |
| 22 (attention-cortex.md) | 20 | — | — |
| 23 (monitor MCP) | — | — | 4,7,9,11,14,16,18,20,21,24,25 |
| 24 (mood tracking) | — | — | 4,7,9,11,14,16,18,20,21,23,25 |
| 25 (thalamus.md) | — | — | 4,7,9,11,14,16,18,20,21,23,24 |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 1: Foundation — Agent Spec Template + 20 .md Rewrites + Orchestrator

- [x] 1. Create agent spec template with circuit-aware sections
  What to do: Create `.opencode/prompts/brain/TEMPLATE.md` as the master template for all 20 brain region agents. Template must have sections: TASK (one-line), INPUT (data sources + upstream agents), OUTPUT (JSON schema + downstream targets), DEPENDENCIES (MCP servers, OMO hooks, other agents), CIRCUIT (feedforward-to, feedback-to, inhibited-by, modulates, modulated-by, competes-with), RULES (triggers, constraints, tool restrictions), QA (self-check criteria). Reference OMO skill pattern (TASK/DELIVERABLE/SCOPE/VERIFY) and foundation-agent connectomics.
  Must NOT do: Do NOT change agent behavior yet — only document the template.
  Parallelization: Wave 1 | Blocked by: (none) | Blocks: todos 2-20
  References:
  - OMO skill delegation pattern for structured agent prompts
  - NousResearch/hermes-agent for brain circuit patterns
  - Foundation agent paper Ch1-15 for connectomics
  - C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\thalamus.md (current format)
  Acceptance criteria: TEMPLATE.md exists with all 7 sections. Each section has example content from thalamus.md filled in.
  QA: Read file — verify all 7 sections present. Lint markdown. Evidence: .omo/evidence/task-1-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave1): add brain agent spec template with circuit-aware sections

- [x] 2. Rewrite all 20 brain agent .md files with new template format
  What to do: For EACH of the 20 `.opencode/prompts/brain/*.md` files, rewrite using the TEMPLATE.md format. Each agent must declare its INPUT (specific data sources + upstream), OUTPUT (exact JSON schema), DEPENDENCIES (which MCPs/hooks it needs), CIRCUIT (who it connects to), RULES (precise trigger conditions), QA (verification). Key circuit connections to define:
  - Feedback: self-enhance → hippocampus (reflections stored as memories)
  - Inhibitory: amygdala CAUTION mode → inhibits thalamus normal routing
  - Modulatory: reward-cortex score → modulates attention-cortex thresholds
  - Competitive: multiple Layer 2 conditionals → winner-takes-most with priority
  - Recurrent: execution results → world-cortex (update codebase state)
  Must NOT do: Do NOT change agent behavior — only reformat documentation. Do NOT change JSON output schemas.
  Parallelization: Wave 1 | Blocked by: todo 1 | Blocks: todos 21+
  References:
  - TEMPLATE.md (just created)
  - C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\*.md (current files)
  - Circuit patterns from foundation-agent paper Ch3.3.4 (basal-ganglia), Ch9 (self-enhance), Ch6 (amygdala)
  Acceptance criteria: All 20 .md files rewritten. Each has all 7 sections filled. `grep -c "## CIRCUIT" *.md` returns 20.
  QA: Check all 20 files have CIRCUIT section. Check DEPENDENCIES section references real MCPs. Evidence: .omo/evidence/task-2-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave1): rewrite 20 brain agent specs with circuit-aware template

- [x] 3. Rewrite brain-master.md orchestrator with circuit-aware routing
  What to do: Rewrite `src/skills/brain-master.md` to implement:
  - Layer 1: 4 parallel perceptions (thalamus/amygdala/hippocampus/world-cortex) with structured context injection
  - Layer 2: Conditional gates with circuit awareness — amygdala CAUTION mode inhibits normal routing, reward score modulates attention threshold, basal-ganglia Go/NoGo overrides execution
  - Layer 3: Swarm dispatch without Team Mode (manual task() chain)
  - Post-action: Self-enhance reflection → memory-store (feedback loop)
  - Status display: circuit-aware status showing active/inhibited/modulated connections
  - Reference: current `C:\Users\86189\Desktop\brain-agent\src\skills\brain-master.md` for existing pattern
  Must NOT do: Do NOT write any code — this is a prompt/rules file only. Do NOT include references to Team Mode.
  Parallelization: Wave 1 | Blocked by: todo 2 | Blocks: todos 21+
  References:
  - Current brain-master.md: src/skills/brain-master.md:1-101
  - All 20 agent .md files from todo 2
  - C:\Users\86189\Desktop\brain-agent\oh-my-openagent.jsonc:3-203 (20 category definitions)
  Acceptance criteria: brain-master.md has Layer 1/2/3 clearly defined. Feedback/inhibitory/modulatory circuits documented. Status display shows circuit state.
  QA: Read file. Verify Layer 1 fires 4 parallel background agents. Verify Layer 2 checks conditional gates. Verify post-action reflection loop. Evidence: .omo/evidence/task-3-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave1): rewrite orchestrator with circuit-aware multi-layer routing

### Wave 2: Memory Enhancement — HippoRAG-style Hybrid Retrieval (hippocampus)

- [x] 4. Add Ollama vector embedding client to memory-store MCP
  What to do: Add `ollama-js` npm dependency to `C:\Users\86189\Desktop\brain-agent\src\mcp\memory-store`. Create `src\mcp\memory-store\src\embedding.ts` that:
  - Connects to local Ollama (default http://localhost:11434)
  - Uses model `bge-small-en-v1.5` (33MB, 384-dim, CPU-only) — can fall back to `nomic-embed-text` or `all-minilm`
  - Exports `getEmbedding(text: string): Promise<number[]>` and `getEmbeddings(texts: string[]): Promise<number[][]>`
  - Caches embeddings in-memory per session (LRU, max 100)
  - Handles Ollama connection errors gracefully (fall back to keyword-only search)
  Must NOT do: Do NOT require GPU. Do NOT require Ollama to be running — gracefully degrade to keyword search.
  Parallelization: Wave 2 | Blocked by: (none — independent) | Blocks: todos 5, 6
  References:
  - memory-store current: src/mcp/memory-store/src/server.ts:14-46 (memory_retrieve tool)
  - memory-store current: src/mcp/memory-store/src/store.ts:51-76 (keyword search)
  - schema.sql: src/mcp/memory-store/src/schema.sql:1-78 (vector embedding column needed)
  - Ollama JS client: https://github.com/ollama/ollama-js
  - bge-small: BAAI/bge-small-en-v1.5 (33MB, 384-dim)
  - HippoRAG paper: https://arxiv.org/abs/2405.14831 (NeurIPS 2024)
  Acceptance criteria: `npm test` passes. `getEmbedding("test")` returns Float64Array(384). Graceful fallback when Ollama is offline.
  QA: Unit test getEmbedding returns correct shape. Integration test: function doesn't crash when Ollama unreachable. Evidence: .omo/evidence/task-4-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave2): add Ollama vector embedding client to memory-store

- [x] 5. Add vector storage and hybrid retrieval to memory-store
  What to do: In `src/mcp/memory-store/src/store.ts`:
  - Add `vector` column (BLOB/Float32Array) to `episodic_memory` and `semantic_memory` tables (ALTER TABLE or re-init)
  - Add `store_embedding` method that stores content + embedding together
  - Add `search_hybrid(query, alpha=0.5)` that does keyword search + vector cosine similarity, returns weighted combination
  - Vector cosine similarity: compute in JS (simple dot product over 384-d vectors, lightweight)
  - Add `memory_retrieve` mode: `"hybrid"` (default) uses keyword+vector, `"keyword"` keeps old behavior, `"vector"` uses vector only
  Must NOT do: Do NOT add external vector DB (pgvector, Chroma). Keep in-process SQLite + JS computation.
  Parallelization: Wave 2 | Blocked by: todo 4 | Blocks: (none)
  References:
  - store.ts: src/mcp/memory-store/src/store.ts:51-76 (search function to modify)
  - types.ts: src/mcp/memory-store/src/types.ts:1-5 (RetrievalResult to extend)
  - server.ts: src/mcp/memory-store/src/server.ts:30-38 (memory_retrieve tool)
  - schema.sql: src/mcp/memory-store/src/schema.sql:4-9 (episodic_memory table)
  - HippoRAG hybrid retrieval: https://arxiv.org/abs/2405.14831
  Acceptance criteria: `search_hybrid("query")` returns results with `score` combining keyword match + cosine similarity. Vector mode returns results sorted by cosine similarity. All existing keyword tests still pass.
  QA: Test hybrid mode returns correct shape. Test fallback when no embeddings exist. Test backward compatibility with keyword mode. Evidence: .omo/evidence/task-5-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave2): add hybrid vector+keyword retrieval to memory-store

- [x] 6. Add episodic replay mechanism and update hippocampus.md
  What to do: In memory-store MCP, add new tool `memory_replay` that:
  - Retrieves top-k episodic memories from last N sessions
  - Groups by similarity (low-dim vector clustering via simple threshold)
  - Returns "replay batches" — groups of related episodes for re-consolidation
  - Optional importance filter (only memories with access_count > threshold or tagged "critical")
  Then update `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\hippocampus.md` to:
  - Use `memory_retrieve(mode="hybrid")` as default
  - Use `memory_replay()` during idle/consolidation cycles
  - Reflect ExpeL (AAAI 2024) experience learning pattern
  Must NOT do: Do NOT implement full HippoRAG (no Pagerank-style indexing). Simple episodic retrieval + threshold grouping only.
  Parallelization: Wave 2 | Blocked by: todo 5 | Blocks: todo 23 (self-enhance feedback loop)
  References:
  - server.ts: src/mcp/memory-store/src/server.ts (add new tool)
  - hippocampus.md: .opencode/prompts/brain/hippocampus.md:1-30
  - ExpeL paper: https://arxiv.org/abs/2308.10144 (AAAI 2024)
  - MemoryBank paper: https://arxiv.org/abs/2308.08589 (AAAI 2024)
  Acceptance criteria: `memory_replay()` returns grouped episodes. hippocampus.md references hybrid mode. `npm test` passes.
  QA: Call memory_replay after storing 5+ episodes — verify groups. Check hippocampus.md has correct tool references. Evidence: .omo/evidence/task-6-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave2): add episodic replay and update hippocampus spec

### Wave 3: Safety Upgrade — L1→G7 Multi-Level Safety Gates

- [x] 7. Expand brain-plugin.mjs from L1+G3 to full G1-G7
  What to do: Rewrite `src/plugin/brain-plugin.mjs` to implement all 7 gate levels:
  - G1 (L1): Dangerous bash patterns (already exists) — BLOCK
  - G2: Suspicious patterns (curl|sh, eval in content, base64 decode in bash) — WARN + LOG
  - G3: Sensitive file access (.env, secrets, .pem, id_rsa, credentials) — BLOCK (already exists)
  - G4: Network egress (curl/wget/fetch to unknown hosts, data exfiltration patterns) — WARN + require safety-cortex approval
  - G5: Prompt injection (ignore previous instructions, system prompt override, role-play) — BLOCK + LOG full context
  - G6: Compliance check (file deletion patterns, mass changes, git operations on protected branches) — WARN + LOG
  - G7: Full audit trail (EVERY tool execution logged with context: tool name, args truncated, timestamp, gate verdict) — always-on logging
  Each gate returns `{gate: "G1"|"G2"|..., action: "block"|"warn"|"log"|"audit", reason: string}`.
  Add `tool.execute.after` hook for G7 audit logging.
  Must NOT do: Do NOT break existing L1 functionality. Do NOT slow down normal tool execution (audit is async log).
  Parallelization: Wave 3 | Blocked by: (none — independent) | Blocks: todo 8
  References:
  - Current plugin: src/plugin/brain-plugin.mjs:1-85
  - OMO plugin hook system: tool.execute.before, tool.execute.after
  - Foundation agent Part IV Safety: L1-G7 gate framework
  - Current L1 patterns: src/plugin/brain-plugin.mjs:18-27
  Acceptance criteria: All 7 gates return correct verdicts. G1 blocks rm -rf /. G3 blocks .env writes. G4 warns on curl to unknown host. G7 logs every tool execution. Existing L1 behavior unchanged.
  QA: Test each gate with sample input. Verify G1 still works. Verify G7 log file created. Evidence: .omo/evidence/task-7-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave3): expand safety plugin from L1 to full G1-G7 gates

- [x] 8. Update safety-cortex.md with full gate awareness
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\safety-cortex.md` to:
  - Reference all 7 gate levels (G1-G7)
  - Define when safety-cortex is triggered per gate (G2/G4/G6 WARN → safety-cortex reviews and decides)
  - Define escalation path: G1/G3/G5 auto-block → safety-cortex can override? (answer: NO for G1/G5, YES for G3 edge cases)
  - Define audit log retention and review process
  - Add CIRCUIT section: Inhibited by amygdala CAUTION mode (stricter thresholds), Modulates all execution agents
  Must NOT do: Do NOT reduce existing safety measures.
  Parallelization: Wave 3 | Blocked by: todo 7 | Blocks: (none)
  References:
  - Current safety-cortex.md: .opencode/prompts/brain/safety-cortex.md:1-15
  - Plugin G1-G7 from todo 7
  - Foundation agent Part IV Safety
  Acceptance criteria: safety-cortex.md references all G1-G7. Defines trigger conditions per gate. Has CIRCUIT section with inhibitory/modulatory connections.
  QA: Read file — verify all 7 gates documented. Verify circuit connections present. Evidence: .omo/evidence/task-8-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave3): update safety-cortex spec with G1-G7 gate awareness

### Wave 4: Tool Tracking — Cerebellum Implicit Recommendation MCP

- [x] 9. Create tool-tracking MCP server for cerebellum
  What to do: Create new MCP server at `src/mcp/tool-tracker/` with:
  - `package.json`, `tsconfig.json`, `src/server.ts`, `src/tracker.ts`
  - SQLite database tracking: tool name, action type, target, success/fail, duration_ms, context_hash
  - Tools:
    - `track_tool_use(action_type, target, success, duration_ms, context)`: Record tool execution
    - `get_tool_stats(tool_name?, k=10)`: Return success rate, avg duration, count per tool
    - `recommend_tool(task_description, k=3)`: Return top-3 recommended tools based on similar task history (simple keyword+success-rate matching)
    - `get_tool_timeline(from, to, k=50)`: Return chronological tool usage for analysis
  - Auto-register with OMO via `tool.execute.after` hook (call `track_tool_use` after every tool)
  Must NOT do: Do NOT store raw command output or file contents — only metadata. Do NOT block tool execution.
  Parallelization: Wave 4 | Blocked by: (none — independent) | Blocks: todo 10
  References:
  - Existing MCP pattern: src/mcp/memory-store/src/server.ts (as reference architecture)
  - Cerebellum paper: Ch2.2 Implicit Tool Selection
  - OMO tool.execute.after hook pattern
  Acceptance criteria: `track_tool_use(...)` stores record. `get_tool_stats()` returns correct counts. `recommend_tool()` returns top-3. `npm test` passes.
  QA: Track 5 tool uses. Get stats — verify counts match. Recommend tool — returns results. Evidence: .omo/evidence/task-9-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave4): create tool-tracking MCP for cerebellum implicit recommendation

- [x] 10. Update cerebellum.md with tool-tracking MCP integration
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\cerebellum.md` to:
  - Use `recommend_tool()` from tool-tracker MCP as primary recommendation source
  - Fall back to prompt-based reasoning when MCP unavailable or no history
  - Consider tool success history from `get_tool_stats()`
  - Add CIRCUIT section: Receives task descriptions from orchestrator, Modulates swarm-coder tool selection
  Must NOT do: Do NOT remove existing tool selection logic — MCP is additive (primary signal, with prompt fallback).
  Parallelization: Wave 4 | Blocked by: todo 9 | Blocks: (none)
  References:
  - Current cerebellum.md: .opencode/prompts/brain/cerebellum.md:1-14
  - Tool-tracker MCP from todo 9
  Acceptance criteria: cerebellum.md references `recommend_tool()` and `get_tool_stats()`. Has CIRCUIT section. Falls back to prompt-based when MCP unavailable.
  QA: Read file — verify MCP references. Verify circuit section. Evidence: .omo/evidence/task-10-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave4): update cerebellum spec with tool-tracker MCP integration

### Wave 6: World Model Enhancement — AST-Level Symbol Analysis (world-cortex)

- [x] 14. Add AST-level symbol extraction to world-model MCP
  What to do: Enhance `src/mcp/world-model/src/graph.ts` to extract symbols (not just imports):
  - Add function/class/variable/interface/type extraction for TypeScript/JavaScript using regex patterns (not full AST parser — keep lightweight)
  - For .ts/.js: extract `function name()`, `class Name`, `interface Name`, `type Name =`, `const name =`, `export function/class/interface/type/const`
  - For .py: extract `def name()`, `class Name:`, `async def name()`
  - For .rs: extract `fn name()`, `struct Name`, `enum Name`, `impl Name`, `trait Name`
  - Store per-file symbol list in DependencyNode (new field: symbols: SymbolInfo[])
  - New query mode for `world_query`: `what="symbols"` returns symbols for target file
  - Add `world_query(what="impact", target="symbol_name")` — find all files referencing a symbol
  Must NOT do: Do NOT use full TypeScript AST parser (ts-morph) — regex-level extraction is sufficient for v1. Do NOT exceed 200 lines total addition.
  Parallelization: Wave 6 | Blocked by: (none — independent) | Blocks: todo 15
  References:
  - Current graph.ts: src/mcp/world-model/src/graph.ts:10-163
  - Current server.ts: src/mcp/world-model/src/server.ts:13-64
  - Current types.ts: src/mcp/world-model/src/types.ts:1-4
  - Foundation agent Ch4: World Model — codebase graph + symbol index
  Acceptance criteria: World model extracts symbols from .ts, .js, .py, .rs files. `world_query(what="symbols")` returns extracted symbols. `world_query(what="impact")` finds references.
  QA: Create test files in each language, index, query symbols — verify extraction. Query impact — verify correct files listed. Evidence: .omo/evidence/task-14-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave6): add AST-level symbol extraction to world-model MCP

- [x] 15. Update world-cortex.md with AST-level analysis
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\world-cortex.md` to:
  - Reference new `world_query(what="symbols")` and `world_query(what="impact")` tools
  - Define symbol-aware risk assessment (high-risk if core symbols affected)
  - Add CIRCUIT section: Receives user messages from orchestrator, Feeds codebase context to swarm agents, Modulated by attention-cortex (priority files get deeper scanning)
  Must NOT do: Do NOT remove existing grep/glob fallback logic.
  Parallelization: Wave 6 | Blocked by: todo 14 | Blocks: (none)
  References:
  - Current world-cortex.md: .opencode/prompts/brain/world-cortex.md:1-29
  - Enhanced world-model from todo 14
  Acceptance criteria: world-cortex.md references symbol queries and impact analysis. Has CIRCUIT section. Preserves grep/glob fallback.
  QA: Read file — verify new tool references. Verify circuit section. Evidence: .omo/evidence/task-15-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave6): update world-cortex spec with AST-level symbol analysis

### Wave 7: SOP Matching — Basal Ganglia Go/NoGo MCP

- [x] 16. Create SOP matching MCP for basal-ganglia
  What to do: Create new MCP server at `src/mcp/sop-tracker/` with:
  - `package.json`, `tsconfig.json`, `src/server.ts`, `src/matcher.ts`
  - Uses existing procedural_memory table in memory-store SQLite (or create its own)
  - Tools:
    - `sop_register(trigger_pattern, steps, preconditions, tags)`: Register new SOP (insert into procedural_memory)
    - `sop_match(task_description, threshold=0.7)`: Match task to SOPs using regex + keyword + embedding similarity
    - `sop_decision(sop_id, confidence, context)`: Return Go/NoGo/Hold decision with confidence score
    - `sop_record_outcome(sop_id, success)`: Update SOP success/fail counts for reinforcement learning
    - `sop_list(status="active")`: List SOPs by status (active/proven/reflex/deprecated)
  - Matching algorithm: regex first (trigger_pattern regex match), then keyword overlap, then embedding cosine similarity (reuse Ollama from embedding.ts)
  - Decision rules: confidence > 0.8 → Go, 0.5-0.8 → Hold (check preconditions), < 0.5 → NoGo
  Must NOT do: Do NOT modify memory-store MCP — use its data via direct SQLite access or via its tools. Do NOT require Ollama for basic regex matching.
  Parallelization: Wave 7 | Blocked by: todo 4 (reuses Ollama embedding) | Blocks: todo 17
  References:
  - Procedural memory schema: src/mcp/memory-store/src/schema.sql:29-36
  - Basal ganglia paper: Ch3.3.4 Go/NoGo decision
  - Embedding module from todo 4: src/mcp/memory-store/src/embedding.ts
  Acceptance criteria: `sop_register` creates SOP. `sop_match` returns matches above threshold. `sop_decision` returns Go/NoGo/Hold. `sop_record_outcome` updates counts.
  QA: Register SOP, match same task — verify match. Record success, verify count increments. Test below-threshold = no match. Evidence: .omo/evidence/task-16-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave7): create SOP matching MCP for basal-ganglia Go/NoGo

- [x] 17. Update basal-ganglia.md with SOP-tracker MCP
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\basal-ganglia.md` to:
  - Use `sop_match()` + `sop_decision()` as primary decision path
  - Define confidence thresholds for Go/NoGo/Hold
  - Add reinforcement learning via `sop_record_outcome()`
  - Add CIRCUIT section: Modulates all Layer 3 execution agents (Go proceeds, NoGo blocks), Receives feedback from reward-cortex (outcomes adjust thresholds), Inhibited by amygdala CAUTION mode (lower Go threshold)
  Must NOT do: Do NOT bypass safety-cortex — NoGo can block, but safety-cortex can override for critical operations.
  Parallelization: Wave 7 | Blocked by: todo 16 | Blocks: (none)
  References:
  - Current basal-ganglia.md: .opencode/prompts/brain/basal-ganglia.md:1-14
  - SOP-tracker MCP from todo 16
  - Foundation agent Ch3.3.4
  Acceptance criteria: basal-ganglia.md references sop_match, sop_decision, sop_record_outcome. Has CIRCUIT section with inhibitory/modulatory connections.
  QA: Read file — verify MCP references and circuit section. Evidence: .omo/evidence/task-17-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave7): update basal-ganglia spec with SOP-tracker MCP integration

### Wave 8: Self-Enhancement — Reflexion Loop + Optimizer

- [x] 18. Create Reflexion-loop MCP for self-enhance-cortex
  What to do: Create new MCP server at `src/mcp/reflexion/` with:
  - `package.json`, `tsconfig.json`, `src/server.ts`, `src/reflector.ts`
  - SQLite DB tracking: reflection cycles, lessons, skill update suggestions
  - Tools:
    - `reflexion_start(task_id, goal)`: Begin reflexion cycle for a task
    - `reflexion_add_observation(cycle_id, observation, type="success"|"failure"|"surprise")`: Record observation
    - `reflexion_generate_lessons(cycle_id)`: Synthesize lessons from observations (simple prompt-based aggregation)
    - `reflexion_suggest_skill(lesson)`: Generate skill update suggestion from lesson
    - `reflexion_apply(cycle_id)`: Apply accepted lessons to relevant agent prompts or MCP data
    - `reflexion_history(k=10)`: Return recent reflexion cycles
  - STaR bootstrap pattern: After each reflexion, check if the lesson is actionable. If yes, queue a skill update.
  - Reflexion loop integration: orchestrator → execute → reflexion_start → add_observation → generate_lessons → suggest_skill → store
  Must NOT do: Do NOT auto-apply suggestions without orchestrator approval. Do NOT store raw conversations — only structured lessons.
  Parallelization: Wave 8 | Blocked by: (none — can work independently) | Blocks: todo 19
  References:
  - Current self-enhance-cortex.md: .opencode/prompts/brain/self-enhance-cortex.md:1-14
  - Reflexion paper: https://arxiv.org/abs/2303.11366 (NeurIPS 2023)
  - STaR paper: https://arxiv.org/abs/2203.14465 (arXiv 2022)
  - Foundation agent Ch9: Self-Enhancement
  Acceptance criteria: Full reflexion cycle works (start → observe → lessons → suggest). Lessons correctly aggregated. Skill suggestions formatted correctly.
  QA: Run reflexion_start, add 3 observations, generate_lessons — verify lessons created. suggest_skill — verify format. Evidence: .omo/evidence/task-18-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave8): create Reflexion-loop MCP for self-enhancement

- [x] 19. Update self-enhance-cortex.md and self-optimizer.md with Reflexion MCP
  What to do: Rewrite both files:
  - `self-enhance-cortex.md`: Use reflexion MCP for structured post-task reflection. Add CIRCUIT section: Feedback to hippocampus (lessons stored as memories), Feedback to basal-ganglia (successful patterns become SOPs), Modulates reward-cortex (outcome feedback adjusts scores)
  - `self-optimizer.md`: Use reflexion MCP `reflexion_suggest_skill()` as input for prompt optimization. Add CIRCUIT section: Modulates brain-master.md (rule updates), Triggered every 3 tasks, Receives pattern data from insula monitoring.
  Must NOT do: Do NOT make self-optimizer auto-apply rules — always suggest, let orchestrator apply.
  Parallelization: Wave 8 | Blocked by: todo 18 | Blocks: (none)
  References:
  - Current self-enhance-cortex.md: .opencode/prompts/brain/self-enhance-cortex.md:1-14
  - Current self-optimizer.md: .opencode/prompts/brain/self-optimizer.md:1-25
  - Reflexion MCP from todo 18
  - Foundation agent Ch9 + Ch9.2
  Acceptance criteria: Both files reference reflexion MCP tools. Both have CIRCUIT sections. Self-optimizer preserves suggestion-based approach without auto-apply.
  QA: Read both files — verify MCP references and circuit connections. Evidence: .omo/evidence/task-19-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave8): update self-enhance and self-optimizer specs with Reflexion MCP

### Wave 9: Attention + DMN + Consolidation + Hypothalamus

- [x] 20. Create priority-queue MCP for attention-cortex
  What to do: Create new MCP server at `src/mcp/priority-queue/` with:
  - `package.json`, `tsconfig.json`, `src/server.ts`, `src/queue.ts`
  - In-memory + SQLite backed queue system
  - Tools:
    - `queue_add(id, description, urgency, effort_estimate, dependencies, context)`: Add task to queue
    - `queue_prioritize()`: Reorder queue based on urgency * 0.4 + effort_reciprocal * 0.3 + dependency_unblock * 0.3
    - `queue_next(k=1)`: Get next k tasks to work on
    - `queue_complete(id)`: Mark task complete, update stats
    - `queue_blocked_by(id)`: Return tasks blocking this one
    - `queue_stats()`: Return queue depth, avg wait time, completion rate
  - Dependency graph: Simple adjacency list (task depends on → unblocks when complete)
  - Priority formula configurable via params
  Must NOT do: Do NOT auto-start tasks — only prioritize and recommend. Do NOT remove tasks without explicit complete.
  Parallelization: Wave 9 | Blocked by: (none — independent) | Blocks: todo 21
  References:
  - Current attention-cortex.md: .opencode/prompts/brain/attention-cortex.md:1-15
  - Foundation agent Ch2.2.3: Attention mechanism / priority scheduling
  - Cognitive load theory for effort estimation
  Acceptance criteria: Can add 5+ tasks with dependencies. `queue_prioritize` reorders by formula. `queue_next` returns highest-priority task. `queue_complete` unblocks dependents.
  QA: Add tasks with dependency chain, prioritize, verify ordering. Complete blocker, verify dependent unblocked. Evidence: .omo/evidence/task-20-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave9): create priority-queue MCP for attention-cortex

- [x] 21. Wire up OMO ulw-loop for DMN + consolidation + hypothalamus periodic agents
  What to do: Update `oh-my-openagent.jsonc` and create agent support:
  - `oh-my-openagent.jsonc` commands section: Map `/ulw-loop` to trigger offline-consolidation agent
  - Add hypothalamus timer config: 30m health check, 6h consolidation trigger
  - DMN agent spec: Connect to memory-store for memory cross-connect, generate insights during idle
  - offline-consolidation agent spec: Use memory-store replay + SOP-tracker for memory consolidation
  - All three agents must define: trigger conditions, input sources, output destinations, circuit connections
  Must NOT do: Do NOT set ulw-loop max_iterations too high (keep <= 5 for consolidation cycles).
  Parallelization: Wave 9 | Blocked by: (none — independent) | Blocks: (none)
  References:
  - Current oh-my-openagent.jsonc: brain-agent\oh-my-openagent.jsonc:219-226 (ulw-loop config)
  - Current dmn.md: .opencode/prompts/brain/dmn.md:1-14
  - Current offline-consolidation.md: .opencode/prompts/brain/offline-consolidation.md:1-18
  - Current hypothalamus.md: .opencode/prompts/brain/hypothalamus.md:1-14
  - Foundation agent Ch3.2.1 (consolidation), Ch11.2 (offline self-improvement)
  Acceptance criteria: oh-my-openagent.jsonc has ulw-loop mapped to consolidation. DMN has CIRCUIT with memory-store cross-connect. Consolidation has replay logic. Hypothalamus has timer config.
  QA: Read oh-my-openagent.jsonc — verify ulw-loop config. Read all 3 agent .md files — verify CIRCUIT sections. Evidence: .omo/evidence/task-21-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave9): wire OMO ulw-loop for DMN/consolidation/hypothalamus agents

- [x] 22. Update attention-cortex.md with priority-queue MCP
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\attention-cortex.md`:
  - Use `queue_prioritize()` as primary prioritization mechanism
  - Define trigger condition (queue depth > 3)
  - Include dependency-unblocking logic from queue tools
  - Add CIRCUIT section: Modulated by reward-cortex (high reward actions get priority boost), Receives todos from orchestrator, Feeds prioritized queue to swarm agents
  Must NOT do: Do NOT remove existing >3 check threshold.
  Parallelization: Wave 9 | Blocked by: todo 20 | Blocks: (none)
  References:
  - Current attention-cortex.md: .opencode/prompts/brain/attention-cortex.md:1-15
  - Priority-queue MCP from todo 20
  Acceptance criteria: attention-cortex.md references `queue_prioritize, queue_next, queue_add, queue_complete`. Has CIRCUIT section. Preserves >3 trigger.
  QA: Read file — verify MCP references and circuit section. Evidence: .omo/evidence/task-22-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave9): update attention-cortex spec with priority-queue MCP

### Wave 10: Insula + Amygdala + Thalamus Refinement

- [x] 23. Create monitoring MCP for insula
  What to do: Create new MCP server at `src/mcp/monitor/` with:
  - `package.json`, `tsconfig.json`, `src/server.ts`, `src/monitor.ts`
  - Tools:
    - `monitor_report_event(event_type, severity, source, details)`: Report system event
    - `monitor_get_alerts(severity="high", since, k=20)`: Get recent alerts
    - `monitor_get_health()`: Return system health summary (MCP status, error rate, avg response time)
    - `monitor_escalate(event_id, target_agent)`: Escalate critical event to specific agent (e.g., safety-cortex)
  - Auto-integrate with G7 audit log for anomaly detection (repeated errors → alert)
  - Severity levels: low (info), medium (warning), high (error), critical (system failure)
  Must NOT do: Do NOT add alert fatigue — only high/critical trigger escalation. Do NOT modify tool behavior — only observe and report.
  Parallelization: Wave 10 | Blocked by: (none — independent) | Blocks: todo 24
  References:
  - Current insula.md: .opencode/prompts/brain/insula.md:1-14
  - G7 audit log from todo 7
  - Foundation agent Ch7: Error detection / interoception
  Acceptance criteria: `monitor_report_event` stores event. `monitor_get_alerts` returns filtered alerts. `monitor_get_health` returns summary. `monitor_escalate` triggers target agent.
  QA: Report events at different severities, get alerts — verify filtering. Get health — verify non-empty. Evidence: .omo/evidence/task-23-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave10): create monitoring MCP for insula error detection

- [x] 24. Add mood tracking to memory-store and update amygdala.md
  What to do: In memory-store MCP, add mood tracking:
  - New table: `mood_state(session_id, mode, confidence, timestamp, decay_rate)`
  - New tools: `mood_set(session_id, mode, confidence)`, `mood_get(session_id)` — returns current mood with decay applied
  - Decay formula: mood confidence decays exponentially (halflife: 30min for URGENT, 2hr for NORMAL)
  Then update amygdala.md:
  - Use `mood_set()/mood_get()` for cross-session mood tracking
  - Define decay rates per mode
  - Add CIRCUIT section: Inhibits thalamus (CAUTION mode → stricter gating), Modulates reward-cortex (URGENT→higher reward multiplier), Feedback to memory-store (mood stored as episodic context)
  Must NOT do: Do NOT persist mood across agent restarts (only session-level). Do NOT make mood override user intent.
  Parallelization: Wave 10 | Blocked by: (none — independent) | Blocks: todo 25
  References:
  - Current amygdala.md: .opencode/prompts/brain/amygdala.md:1-24
  - memory-store MCP: src/mcp/memory-store/src/server.ts (add tools)
  - Foundation agent Ch6: Emotion systems
  Acceptance criteria: `mood_set` stores mood. `mood_get` returns mood with decay applied (lower confidence over time). amygdala.md references mood tools and has CIRCUIT section.
  QA: Set mood URGENT, get mood after 0min — confidence unchanged. After simulated 60min — confidence decreased. Evidence: .omo/evidence/task-24-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave10): add mood tracking to memory-store, update amygdala spec

- [x] 25. Refine thalamus.md with enhanced gating circuit
  What to do: Update `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\thalamus.md` to:
  - Add multi-label intent classification (not single intent — can be "question+debug" or "implement+research")
  - Add structured urgency signals with source decomposition (explicit keywords + implicit tone analysis + message length)
  - Add CIRCUIT section: Inhibited by amygdala CAUTION mode (stricter gating threshold), Feedforward to hippocampus (message as memory trigger), Feedforward to world-cortex (message as codebase query trigger)
  - Preserve existing gating patterns (5 rules currently)
  Must NOT do: Do NOT reduce existing urgency scoring. Do NOT change JSON output schema (additive only).
  Parallelization: Wave 10 | Blocked by: (none — independent) | Blocks: (none)
  References:
  - Current thalamus.md: .opencode/prompts/brain/thalamus.md:1-25
  - Amygdala mood tracking from todo 24
  - Foundation agent Ch1.2: Sensory gating
  Acceptance criteria: thalamus.md has multi-label intent, structured urgency sources, CIRCUIT section with inhibitory/modulatory connections. Output JSON schema backward-compatible.
  QA: Read file — verify new sections. Verify output schema unchanged from current. Evidence: .omo/evidence/task-25-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave10): refine thalamus spec with enhanced gating and circuit connections

- [x] 11. Add UCB exploration bonus to reward-system MCP
  What to do: In `src/mcp/reward-system/src/scorer.ts`:
  - Add UCB1 formula: `score = avg_reward + sqrt(2 * ln(total_actions) / action_count)`
  - Track per-action-type visit counts in a Map
  - Add exploration bonus to extrinsic score: `extrinsic += ucb_bonus * exploration_weight`
  - Default exploration_weight = 0.3 (configurable via alpha parameter)
  - If action_count < 5 for a type, apply initial exploration bonus (larger for unseen actions)
  Must NOT do: Do NOT make UCB bonus exceed 3 points (cap exploration). Do NOT require external state store — keep in-memory.
  Parallelization: Wave 5 | Blocked by: (none — independent) | Blocks: todo 12
  References:
  - Current scorer: src/mcp/reward-system/src/scorer.ts:7-55
  - Current types: src/mcp/reward-system/src/types.ts:1-4
  - UCB1 algorithm: Auer, Cesa-Bianchi, Fischer (2002)
  - Foundation agent Ch5: UCB-TD hybrid reward
  Acceptance criteria: UCB bonus calculated per action_type. Exploratory actions (low count) get higher bonus. Cap at 3. All existing tests pass unchanged.
  QA: Call score_action 10 times on same type — verify UCB bonus decreases. Call on new type — verify high initial bonus. Evidence: .omo/evidence/task-11-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave5): add UCB1 exploration bonus to reward-system scorer

- [x] 12. Add TD learning update and hierarchical scoring to reward-system
  What to do: In `src/mcp/reward-system/src/scorer.ts`:
  - Add TD(0) update: `V(s) += lr * (reward + gamma * V(s') - V(s))`
  - Track state values in Map<state_hash, value>
  - Add hierarchical scoring: atomic actions → steps → tasks (aggregate score upward)
  - New tool: `score_hierarchy(action_ids[])` — takes array of action IDs, returns aggregate step/task score
  - Add `hierarchical` field to ScoreOutput
  Must NOT do: Do NOT persist TD values to disk (in-memory only, resets on restart). Do NOT use discount factor > 0.9.
  Parallelization: Wave 5 | Blocked by: todo 11 | Blocks: (none)
  References:
  - Current scorer: src/mcp/reward-system/src/scorer.ts:7-55
  - TD learning: Sutton & Barto, Reinforcement Learning (1998)
  - Foundation agent Ch5: hierarchical reward shaping
  Acceptance criteria: TD update changes state value. Hierarchical score aggregates correctly. New `score_hierarchy` tool returns valid results.
  QA: Call atomic action, then step — verify step aggregates atomic. Check TD value changes after outcome. Evidence: .omo/evidence/task-12-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave5): add TD learning and hierarchical scoring to reward-system

- [x] 13. Update reward-cortex.md with UCB-TD scoring
  What to do: Rewrite `C:\Users\86189\Desktop\brain-agent\.opencode\prompts\brain\reward-cortex.md` to:
  - Reference UCB exploration bonus and TD learning from enhanced reward-system
  - Define risk calibration thresholds (UCB-adjused scores)
  - Add hierarchical scoring guidelines for atomic/step/task levels
  - Add CIRCUIT section: Modulates attention-cortex thresholds, Receives outcome feedback from self-enhance
  Must NOT do: Do NOT remove existing scoring rules.
  Parallelization: Wave 5 | Blocked by: todos 11, 12 | Blocks: (none)
  References:
  - Current reward-cortex.md: .opencode/prompts/brain/reward-cortex.md:1-15
  - Enhanced scorer from todos 11, 12
  Acceptance criteria: reward-cortex.md references UCB bonus, TD learning, hierarchical scoring. Has CIRCUIT section. All previous output formats preserved.
  QA: Read file — verify UCB/TD/hierarchical references present. Verify circuit section. Evidence: .omo/evidence/task-13-brain-agent-paper-upgrade.md
  Commit: Y | feat(wave5): update reward-cortex spec with UCB-TD and hierarchical scoring

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — ALL APPROVE
- [x] F2. Code quality review — ALL APPROVE
- [x] F3. Real manual QA — ALL APPROVE
- [x] F4. Scope fidelity — ALL APPROVE

## Commit strategy
- 25 commits, one per todo — each commit is atomic (one feature/change per commit)
- Conventional commits: `feat(wave<N>): <description>`
- Independent MCPs and plugin changes can be committed immediately upon passing QA
- Agent .md rewrites commit together per wave (e.g., "feat(wave1): rewrite 20 brain agent specs with circuit template")
- Final commit after all waves: `chore: bump brain-agent version to 2.0.0`
- Commit scope examples: wave1, wave2, wave3, wave4, wave5, wave6, wave7, wave8, wave9, wave10

## Success criteria
1. All 20 brain agent .md files rewritten with full TASK/INPUT/OUTPUT/DEPENDENCIES/CIRCUIT/RULES/QA sections
2. brain-master.md implements Layer 1/2/3 with circuit-aware routing (feedback, inhibitory, modulatory)
3. memory-store MCP supports hybrid (keyword+vector) retrieval with local Ollama
4. memory-store MCP supports episodic replay
5. brain-plugin.mjs implements all G1-G7 safety gates
6. tool-tracker MCP records tool usage and returns recommendations
7. reward-system MCP supports UCB bonus, TD learning, hierarchical scoring
8. world-model MCP supports AST-level symbol extraction
9. SOP-tracker MCP matches tasks to SOPs and returns Go/NoGo decisions
10. Reflexion-loop MCP supports structured reflection cycles
11. priority-queue MCP supports dependency-aware task prioritization
12. monitor MCP tracks system events and escalates critical alerts
13. Mood tracking in memory-store with exponential decay
14. OMO ulw-loop configured for dmn/consolidation/hypothalamus
15. All 5 new MCP servers pass `npm test`
16. All 3 enhanced MCP servers pass `npm test`
17. brain-plugin.mjs G1-G7 tests pass
18. No regression in existing brain-agent behavior
