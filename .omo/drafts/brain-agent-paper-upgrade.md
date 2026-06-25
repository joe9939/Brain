---
slug: brain-agent-paper-upgrade
status: drafting
intent: clear
pending-action: write .omo/plans/brain-agent-paper-upgrade.md
approach: 10-wave upgrade — enhance 3 existing MCPs, create 5 new MCPs, expand plugin to G7, rewrite all 20 brain agent .md files with circuit specs, update brain-master.md orchestrator with feedback/inhibitory/modulatory circuits inspired by NousResearch/hermes-agent
---

# Draft: brain-agent-paper-upgrade

## Components (topology ledger)
| id | outcome | status | evidence path |
|----|---------|--------|---------------|
| C1 | Enhanced memory-store MCP (HippoRAG + vector) | active | src/mcp/memory-store/src/store.ts:51-76 |
| C2 | Enhanced world-model MCP (AST-level symbols) | active | src/mcp/world-model/src/graph.ts:10-163 |
| C3 | Enhanced reward-system MCP (UCB-TD) | active | src/mcp/reward-system/src/scorer.ts:7-55 |
| C4 | Safety plugin G2-G7 gates | active | src/plugin/brain-plugin.mjs:14-84 |
| C5 | New SOP-matching MCP (basal-ganglia) | deferred | procedural memory schema exists |
| C6 | New tool-tracking MCP (cerebellum) | deferred | no existing code |
| C7 | New Reflexion-loop MCP (self-enhance) | deferred | no existing code |
| C8 | New priority-queue MCP (attention) | deferred | no existing code |
| C9 | New monitoring MCP (insula) | deferred | no existing code |
| C10 | Enhanced agent .md files with circuit spec | active | 20 prompt files |
| C11 | brain-master.md orchestrator rewrite | active | src/skills/brain-master.md |
| C12 | OMO ulw-loop for consolidation/dmn | deferred | oh-my-openagent.jsonc:219-226 |

## Findings
- OMO categories DO NOT support per-category skills/prompt/context injection — only model/variant/fallback
- OMO hook system supports: tool.execute.before/after, context-injection, rules-injector, compaction-context-injector, hook-message-injector
- OMO team_mode provides shared_task_list + file_locked_claims + parallel members
- OMO ulw-loop maps to continuous run for consolidation agents
- memory-store uses SQLite keyword search only — no vector embeddings
- reward-system uses simple extrinsic+intrinsic scoring — no UCB exploration bonus
- world-model uses import regex scanning — no AST-level symbol extraction
- brain-plugin.mjs has L1 bash block + G3 file guard only — missing G2/G4/G5/G6/G7
- awesome-foundation-agents provides per-component paper references with open-source code links
- NousResearch/hermes-agent suggests complex brain circuits beyond serial/parallel

## Decisions
1. **Vector embeddings**: Local Ollama + bge-small-en-v1.5 (33MB, CPU-only, TS client via ollama-js)
2. **MCP language**: All TypeScript — keep current stack consistent
3. **Safety architecture**: Single brain-plugin.mjs with all G1-G7 gates in one file
4. **Routing**: No OMO Team Mode — brain-master.md handles all routing manually
5. **Circuit patterns**: Each sub-agent .md must declare: feedforward, feedback, inhibitory, modulatory, competitive connections
6. **Sub-agent .md template**: Must include TASK, INPUT, OUTPUT, DEPENDENCIES, CIRCUIT, RULES, QA sections

## Scope IN
- 3 existing MCP enhancements (memory-store, world-model, reward-system)
- 5 new MCP servers (SOP-tracker, tool-tracker, reflexion, priority-queue, monitor)
- Plugin expansion to G7 (G2: warn, G3: file guard, G4: network, G5: injection, G6: compliance, G7: audit)
- All 20 sub-agent .md rewrites with full circuit+dependency spec
- brain-master.md orchestrator rewrite with circuit-aware routing
- OMO ulw-loop config for consolidation/dmn/hypothalamus periodic tasks
- New sub-agent circuit connections: feedback loops, inhibitory paths, modulatory paths

## Scope OUT
- OMO Team Mode usage
- Python MCP servers
- Cloud embedding API dependencies
- External SaaS monitoring services
- UI/dashboard for brain status
- Performance benchmarks (deferred to separate task)

## Open questions
None — all 4 architecture decisions resolved by user.

## Approval gate
status: drafting
— User said "继续" after answering architecture questions. Proceeding to write plan.
