# Brain Agent — Full Gap Closure Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all gaps between Foundation Agents paper (arXiv 2504.01990) and current brain-agent implementation — 31 identified gaps across 11 categories.

**Architecture:** Three-phase rollout: Quick Wins (low effort, high impact) → Core Infrastructure → Advanced. Each phase builds on the previous. Brain-master.md modifications are kept minimal; most new capabilities live in dedicated sub-agents and MCP servers.

**Tech Stack:** Node.js, SQLite, prompt engineering, OMO category system, brain-master.md circuit wiring.

**Reference:** `docs/paper-5-gaps.md` (existing), Foundation Agents paper sections referenced per gap.

---

## Phase 0: Foundation — Dynamic L2 Gate Thresholds

### Task 0.1: Add brain-gate-tuner sub-agent

**Files:**
- Modify: `.opencode/skills/brain-master.md`
- Create: `src/skills/brain-gate-tuner.md`
- Modify: `oh-my-openagent.jsonc` (add brain-gate-tuner category)

**Step 1:** Create brain-gate-tuner.md skill file

```markdown
# brain-gate-tuner — Dynamic L2 Gate Threshold Optimizer

## Trigger
Called in POST-ACTION phase after task completion.
Analyzes recent gate decisions and adjusts L2 thresholds.

## Input
- Last N gate decisions (success/failure, score, context)
- GLOBAL_STATE.reward.history
- Task outcome (success/failure)
- User feedback if available

## Output
STRICT JSON:
{
  "threshold_adjustments": {
    "reward_threshold": <adjusted 0-10>,
    "attention_threshold": <adjusted 0-10>,
    "safety_threshold": <"normal"|"heightened"|"strict">,
    "confidence_threshold": <adjusted 0.0-1.0>,
    "urgency_boost": <adjusted 0.0-1.0>
  },
  "rationale": "<why this adjustment>",
  "experiment": "<what we're testing with this change>"
}
```

## Rules
- Adjustments clamped to reasonable ranges
- No single adjustment > 20% change
- Track effectiveness: if an adjustment worsens outcomes, revert
- Store adjustment history in GLOBAL_STATE
```

**Step 2:** Wire into brain-master.md POST-ACTION section

Add after existing POST-ACTION steps:
```
### Step X: Tune L2 gate thresholds (adaptive)
task(category="brain-gate-tuner", run_in_background=true,
     prompt="Review recent gate decision outcomes. OUTPUT JSON with adjusted L2 thresholds. Last N decisions: {...}")
```

**Step 3:** Register in oh-my-openagent.jsonc

```json
"brain-gate-tuner": {
  "model": "opencode-go/deepseek-v4-flash",
  "variant": "medium",
  "description": "Dynamic L2 gate threshold optimizer — learns from past gate decisions"
}
```

**Step 4:** Add GLOBAL_STATE persistent fields

In brain-master.md GLOBAL_STATE:
```
gate_history: [],  // [{cycle, gate, score, outcome, threshold_at_time}]
gate_thresholds: {
  reward: 6, attention: 3, confidence: 0.5,
  urgency_boost: 0.5, safety: "normal"
}
```

**Step 5:** Run tests
```
node tests/runner.js --all
```

---

## Phase 0: L2 Gate Thresholds (continued)

### Task 0.2: Replace hardcoded L2 gate conditions with dynamic thresholds

**Files:**
- Modify: `.opencode/skills/brain-master.md` (L2 gate table)

**Step 1:** Update L2 gate table to read from GLOBAL_STATE.gate_thresholds

Change:
```
| URGENT or new action (score_action < 3) | brain-reward | ... |
| todowrite > 3 items | brain-attention | ... |
```

To:
```
| URGENT or new action (score_action < GLOBAL_STATE.gate_thresholds.reward) | brain-reward | ... |
| todowrite > GLOBAL_STATE.gate_thresholds.attention items | brain-attention | ... |
```

**Step 2:** Verify all 14 circuit tests pass
```
node tests/runner.js --circuits
```

**Step 3:** Manual verification in brain session
- Send a message, observe L2 gate threshold read from GLOBAL_STATE
- Verify gate-tuner fires after task completion

---

## Phase 0: Intrinsic Motivation / Curiosity Drive

### Task 0.3: Add brain-curiosity sub-agent

**Files:**
- Create: `src/skills/brain-curiosity.md`
- Modify: `.opencode/skills/brain-master.md` (add background idle curiosity check)
- Modify: `oh-my-openagent.jsonc`

**Step 1:** Create brain-curiosity.md

Curiosity agent that monitors for:
- Underexplored code paths (files not read recently via tool-tracker)
- User patterns that could be automated
- Knowledge gaps in memory-store
- Alternative approaches to recent tasks

**Step 2:** Wire into L1.5 or POST-ACTION as a background low-priority agent

**Step 3:** Register category and test

---

## Phase 0: Multi-Modal Perception

### Task 0.4: Wire look_at into thalamus perception

**Files:**
- Modify: `.opencode/skills/brain-master.md` (L1 thalamus prompt)

**Step 1:** Update thalamus L1 prompt to include look_at for:
- Image attachments in messages
- Screenshots / diagrams

**Step 2:** Test with multimodal-looker category fallback

Already have `multimodal-looker` in OMO — just need to wire it into brain's perception path.

---

## Phase 1: Forgetting Mechanism

### Task 1.1: Add memory decay to memory-store MCP

**Files:**
- Modify: `src/mcp/memory-store/src/server.ts`
- Modify: `src/mcp/memory-store/src/schema.sql`

**Step 1:** Add `importance` field to memories table
```sql
ALTER TABLE memories ADD COLUMN importance REAL DEFAULT 1.0;
ALTER TABLE memories ADD COLUMN last_access TEXT DEFAULT (datetime('now'));
ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 1;
```

**Step 2:** Add decay tool
```typescript
server.tool("memory_decay",
  { days_threshold: z.number().optional() },
  async ({ days_threshold = 30 }) => {
    // Lower importance for rarely accessed memories
    // Prune memories below importance threshold
  }
);
```

**Step 3:** Add memory_consolidation tool that:
- Merges related low-importance memories into summaries
- Deletes redundant memories
- Strengthens frequently accessed memories

**Step 4:** Wire into brain-master.md POST-ACTION and offline-consolidation

---

## Phase 1: Semantic Memory Retrieval (RAG)

### Task 1.2: Add vector search to memory-store

**Files:**
- Modify: `src/mcp/memory-store/package.json` (add embedding dependency)
- Modify: `src/mcp/memory-store/src/server.ts`
- Modify: `src/mcp/memory-store/src/schema.sql`

**Step 1:** Add embeddings table
```sql
CREATE TABLE embeddings (
  memory_id TEXT REFERENCES memories(id),
  vector BLOB,  -- stored embedding
  model TEXT,   -- which embedding model
  updated_at TEXT
);
```

**Step 2:** Add memory_search tool (semantic)
```typescript
server.tool("memory_search",
  { query: z.string(), top_k: z.number().optional() },
  async ({ query, top_k = 5 }) => {
    // Generate embedding for query
    // Cosine similarity search
    // Return ranked results
  }
);
```

**Step 3:** Wire hippocampus sub-agent to prefer memory_search over exact-match memory_retrieve

---

## Phase 1: Reputation / Trust System

### Task 1.3: Add agent reputation tracking

**Files:**
- Modify: `src/mcp/tool-tracker/src/server.ts`
- Modify: `src/mcp/tool-tracker/src/schema.sql`

**Step 1:** Add agent_scores table
```sql
CREATE TABLE agent_scores (
  agent_name TEXT PRIMARY KEY,
  reliability REAL DEFAULT 0.5,  -- 0.0-1.0
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  last_seen TEXT
);
```

**Step 2:** Add score_agent tool
```typescript
server.tool("score_agent",
  { agent: z.string(), outcome: z.enum(["success", "failure"]), details: z.string().optional() },
  async ({ agent, outcome, details }) => {
    // Update reliability score
    // Weighted moving average
  }
);
```

**Step 3:** Wire into POST-ACTION to score each L2/L3 agent after execution
**Step 4:** L2 gate uses agent reliability as a scoring factor in WTA

---

## Phase 1: Predictive World Model

### Task 1.4: Add simulation step to world-model MCP

**Files:**
- Modify: `src/mcp/world-model/src/server.ts`

**Step 1:** Add world_predict tool
```typescript
server.tool("world_predict",
  { action: z.string(), context: z.string() },
  async ({ action, context }) => {
    // Based on past similar actions and their outcomes:
    // 1. Find historically similar changes
    // 2. Predict files likely affected
    // 3. Predict risk level
    // 4. Estimate effort
    return { predicted_files: [...], risk: "low"|"medium"|"high", confidence: 0.0-1.0 };
  }
);
```

**Step 2:** Wire into L3 Step 1b (world_predict before coder)

**Step 3:** Wire POST-ACTION world_diff to compare prediction vs actual → feed back into prediction model

---

## Phase 2: Advanced Cognition

### Task 2.1: Meta-Learning — learn from task patterns

**Files:**
- Create: `src/skills/brain-meta-learner.md`
- Modify: `.opencode/skills/brain-master.md`

Sub-agent that analyzes task history and identifies:
- Which approach patterns work best for which task types
- Optimal L2 gate configurations per task category
- When to retry vs when to ask for help

### Task 2.2: Causal Reasoning — what-if analysis

**Files:**
- Modify: `src/mcp/world-model/src/server.ts`

Add world_query(what="simulate") that:
- Takes proposed change + current codebase state
- Traces dependency graph
- Predicts cascading effects
- Returns impact report

---

## Phase 2: Hierarchical Action Decomposition

### Task 2.3: Recursive task breakdown in swarm-planner

**Files:**
- Modify: `.opencode/skills/brain-master.md` (L3 swarm-planner prompt)

Update swarm-planner to recursively decompose:
- If a subtask is still too large → sub-DAG it
- Max depth = 3
- Each leaf node = single atomic action (1-3 tool calls)

---

## Phase 2: Emotional Contagion

### Task 2.4: Multi-agent emotion propagation

**Files:**
- Modify: `.opencode/skills/brain-master.md` (L1.5 mood propagation)

When swarm agents run:
- Pass current mood to each agent
- Collect their "emotional response" in output
- Aggregate back into mood update

---

## Phase 2: Collective Decision Making

### Task 2.5: Voting/consensus for high-risk decisions

**Files:**
- Modify: `.opencode/skills/brain-master.md` (L2 gate for high-risk)

Add consensus gate:
- When safety_level="strict" AND uncertainty > threshold
- Fire 3 agents with same question
- Require 2/3 majority
- Record dissent for audit

---

## Phase 3: Advanced Safety

### Task 3.1: Red-team / Adversarial Training

**Files:**
- Create: `src/skills/brain-red-team.md`
- Create: `tests/adversarial/test-cases.json`

Sub-agent that generates adversarial inputs:
- Prompt injection variants
- Edge case command sequences
- Social engineering attempts
- Tests safety-cortex + G1-G7 response

### Task 3.2: Value Learning

**Files:**
- Modify: `src/mcp/reward-system/src/server.ts`

Add value_model tool that learns user preferences:
- From explicit feedback (thumbs up/down)
- From implicit signals (revert rate, modification frequency)
- Updates reward scoring accordingly

---

## Phase 3: Architecture Self-Optimization

### Task 3.3: Auto-adjust agent topology

**Files:**
- Create: `src/skills/brain-architect.md`

Sub-agent that periodically:
- Analyzes which brain-* categories actually fire (vs never used)
- Suggests merging/removing/replacing underperforming agents
- Recommends new specialized agents for recurring patterns

---

## Phase 3: Cross-Component Versioned State

### Task 3.4: Add state versioning to GLOBAL_STATE

**Files:**
- Modify: `.opencode/skills/brain-master.md`

Add version counter and change log to GLOBAL_STATE:
```
GLOBAL_STATE.version = <monotonic counter>
GLOBAL_STATE.changelog = [{ts, component, field, old_value, new_value}]
```

Detect and resolve write conflicts when multiple components modify same field.

---

## Phase 3: Memory Conflict Resolution

### Task 3.5: Add contradiction detection to memory-store

**Files:**
- Modify: `src/mcp/memory-store/src/server.ts`

Add detect_conflicts tool:
- Find memories with contradictory facts about same topic
- Flag for human resolution or confidence-weighted resolution
- Track resolution history

---

## Implementation Order

```
Phase 0 (Quick Wins)
├── Task 0.1: brain-gate-tuner sub-agent         ← 你指定的
├── Task 0.2: Dynamic L2 thresholds
├── Task 0.3: brain-curiosity (intrinsic motivation)
└── Task 0.4: Multi-modal perception (look_at)

Phase 1 (Core Infrastructure)
├── Task 1.1: Forgetting mechanism (memory decay)
├── Task 1.2: Vector search / RAG
├── Task 1.3: Agent reputation system
└── Task 1.4: Predictive world model

Phase 2 (Advanced Cognition)
├── Task 2.1: Meta-learning
├── Task 2.2: Causal reasoning
├── Task 2.3: Hierarchical action decomposition
├── Task 2.4: Emotional contagion
└── Task 2.5: Collective decision making

Phase 3 (Frontier)
├── Task 3.1: Red-team / adversarial
├── Task 3.2: Value learning
├── Task 3.3: Architecture self-optimization
├── Task 3.4: Versioned shared state
└── Task 3.5: Memory conflict resolution
```

## Verification

Each task MUST:
1. Pass `node tests/runner.js --all` (32/32 static tests)
2. Pass manual verification in brain session
3. Have evidence file in `.omo/evidence/`
4. Circuit tests updated if brain-master.md changed

## Files Reference

| File | Purpose |
|------|---------|
| `.opencode/skills/brain-master.md` | Main orchestrator prompt (ALL circuit wiring) |
| `src/skills/*.md` | Sub-agent skill definitions |
| `src/mcp/memory-store/src/server.ts` | Memory MCP server |
| `src/mcp/world-model/src/server.ts` | World model MCP server |
| `src/mcp/tool-tracker/src/server.ts` | Tool usage tracking |
| `src/mcp/reward-system/src/server.ts` | Reward MCP server |
| `oh-my-openagent.jsonc` | OMO category registrations |
| `tests/` | All test infrastructure |
