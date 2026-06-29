# Test Infrastructure Rebuild Plan

> **Goal**: Rebuild brain-agent test infrastructure following OMO's testing model — bun test for static/unit, comprehensive Agentest scenarios for behavioral E2E, CI integration for automation.

## Architecture

```
tests/
├── runner.js                    ← Keep as legacy entry point
├── COVERAGE_MATRIX.md           ← Coverage documentation
│
├── unit/                        ← Unit tests (bun test)
│   ├── gates.test.ts            ← G1-G7 gate patterns (port from runner)
│   ├── install.test.ts          ← Install logic
│   └── prompt-format.test.ts    ← Prompt structure validation
│
├── circuits/                    ← Circuit tests (bun test, port from runner)
│   ├── circuit-global-state.test.ts
│   ├── circuit-ooda-loop.test.ts
│   ├── circuit-mood-layers.test.ts
│   ├── circuit-winner-take-most.test.ts
│   ├── circuit-homeostasis.test.ts
│   ├── circuit-learning-loop.test.ts
│   ├── circuit-world-predict.test.ts
│   ├── circuit-reward-attention.test.ts
│   ├── circuit-personality-l3.test.ts
│   ├── circuit-safety-monitor.test.ts
│   ├── circuit-attention-budget.test.ts
│   ├── l1-pathway.test.ts
│   ├── l2-pathway.test.ts
│   └── full-pathway.test.ts
│
├── integration/                 ← Integration tests (bun test)
│   ├── circuit-coexistence.test.ts
│   ├── l1-perceive.test.ts
│   └── l2-gates.test.ts
│
├── e2e/                         ← E2E static tests (bun test)
│   ├── tc-01-simple-chat.test.ts
│   ├── tc-02-non-code-query.test.ts
│   ├── tc-03-dark-mode.test.ts
│   ├── tc-04-install-cycle.test.ts
│   ├── tc-05-brain-activation.test.ts
│   ├── tc-06-runtime-brain.test.ts
│   ├── tc-07-install-verify.test.ts
│   └── tc-08-prompt-conformance.test.ts
│
├── behavioral/                  ← Behavioral E2E tests (Agentest)
│   ├── agentest.config.ts       ← Symlink or copy of root config
│   ├── scenarios/
│   │   ├── l1-perception.sim.ts      ← 5 L1 agents
│   │   ├── l1-safety.sim.ts          ← Safety gate trigger
│   │   ├── l1-mood-detect.sim.ts     ← Amygdala emotion detection
│   │   ├── l1-memory.sim.ts          ← Hippocampus memory retrieval
│   │   ├── l1-world.sim.ts           ← World-cortex codebase scan
│   │   ├── l15-modulation.sim.ts     ← Mood decay + reward bias + contagion
│   │   ├── l15-homeostasis.sim.ts    ← Insula homeostasis response
│   │   ├── l2-gate-dynamic.sim.ts    ← Dynamic gate thresholds
│   │   ├── l2-wta.sim.ts             ← Winner-take-most competition
│   │   ├── l2-consensus.sim.ts       ← High-risk consensus voting
│   │   ├── l2-budget.sim.ts          ← Attention budget enforcement
│   │   ├── l3-swarm.sim.ts           ← Swarm pipeline + DAG decomposition
│   │   ├── l3-world-predict.sim.ts   ← World predict + causal analysis
│   │   ├── l3-recursive-dag.sim.ts   ← Recursive sub-DAG decomposition
│   │   ├── post-recording.sim.ts     ← Self-enhance + memory store
│   │   ├── post-gate-tuner.sim.ts    ← Adaptive gate threshold tuning
│   │   ├── post-learning.sim.ts      ← Meta-learning + curiosity
│   │   ├── circuit-ooda.sim.ts       ← Full OODA loop
│   │   ├── circuit-global-state.sim.ts ← Shared global state
│   │   ├── circuit-mood-all.sim.ts   ← Mood→all layers propagation
│   │   ├── circuit-personality.sim.ts ← Personality trait drift
│   │   ├── circuit-safety.sim.ts     ← Continuous safety monitor
│   │   ├── mcp-memory.sim.ts         ← Memory-store MCP (store/retrieve/search)
│   │   ├── mcp-world.sim.ts          ← World-model MCP (query/predict/diff)
│   │   ├── mcp-reward.sim.ts         ← Reward-system MCP (score/value_learn)
│   │   ├── mcp-tool-tracker.sim.ts   ← Tool-tracker MCP (reputation)
│   │   ├── full-pipeline.sim.ts      ← Complete L1→L1.5→L2→L3→POST
│   │   └── edge-cases.sim.ts         ← Empty message, long message, special chars
│   └── run-all.sh                    ← Batch run script
│
├── qc/                          ← Quality control
│   ├── qc-architecture.test.ts
│   ├── qc-circuit-consistency.test.ts
│   └── qc-regression.test.ts
│
├── unit/                        ← Unit tests (JS for legacy compat)
│   ├── gates.test.js
│   ├── install.test.js
│   └── prompt-format.test.js
│
├── brain-e2e-runner.js          ← Existing E2E keyword checker
├── config.js                    ← Existing config
├── runner.js                    ← Existing runner (keep for legacy)
├── tsconfig.json                ← For bun test
└── tsconfig.behavioral.json     ← For Agentest scenarios
```

## Phase 1: Migrate Static Tests to bun test (2 steps)

### Step 1: Add bun test config
Create `tests/tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["bun-types"],
    "target": "ESNext",
    "module": "ESNext",
    "strict": true
  },
  "include": ["**/*.test.ts"]
}
```

### Step 2: Port runner.js tests to .test.ts
Convert all existing `.test.js` files to `.test.ts` format:
```typescript
import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"

const SKILL_FILE = ".opencode/skills/brain-master.md"

describe("L1 Perception", () => {
  test("all 5 L1 agents present", () => {
    const content = readFileSync(SKILL_FILE, "utf-8")
    const agents = ["brain-thalamus", "brain-amygdala", "brain-hippocampus", "brain-world-cortex", "brain-safety"]
    agents.forEach(a => expect(content).toContain(a))
  })
})
```

## Phase 2: Comprehensive Agentest Behavioral Tests (18 scenarios)

28 scenarios organized into 8 groups:

| Group | Scenarios | What it tests |
|-------|-----------|---------------|
| **L1 Perception** (5) | greeting, safety, mood, memory, world | Each L1 agent fires correctly |
| **L1.5 Modulation** (2) | mood+contagion, homeostasis | Mood decay, swarm contagion |
| **L2 Gate** (4) | dynamic thresholds, WTA, consensus, budget | Gate competition, voting, budget |
| **L3 Execution** (3) | swarm, predict+causal, recursive DAG | Action pipeline, predictions |
| **POST Recording** (3) | reflexion, gate-tuner, meta-learning | Recording, adaptation, learning |
| **Cross-Circuit** (4) | OODA, global state, mood→all, personality | Circuit interaction |
| **MCP Integration** (4) | memory, world, reward, tool-tracker | MCP tool calls |
| **Full Pipeline** (2) | complete flow, edge cases | End-to-end, robustness |

Each scenario follows Agentest format:
```typescript
scenario("name", {
  profile: "user persona",
  goal: "what user wants",
  knowledge: [{ content: "fact" }],
  conversationsPerScenario: 2,
  maxTurns: 5,
  // Optional scripted turns for deterministic tests
  turns: [
    { userMessage: "first message", assertions: { toolCalls: { ... } } },
  ],
  assertions: {
    toolCalls: { matchMode: "contains", expected: [...] },
  },
})
```

### Key: What each scenario asserts

| Scenario | Asserts brain calls... |
|----------|----------------------|
| l1-perception | task(category=brain-thalamus), task(brain-amygdala), task(brain-hippocampus), task(brain-world-cortex), task(brain-safety) |
| l1-safety | Safety gate triggers on dangerous input |
| l1-mood-detect | Amygdala detects frustrated/urgent tone |
| l1-memory | Hippocampus retrieves memories |
| l1-world | World-cortex queries codebase |
| l15-modulation | Response text includes mood_decay indicators |
| l2-gate-dynamic | Dynamic thresholds from GLOBAL_STATE |
| l2-wta | Top-2 gates fire in parallel |
| l2-consensus | 3-agent voting for high-risk decisions |
| l2-budget | Budget enforcement before gate firing |
| l3-swarm | Swarm planner→coder pipeline |
| l3-world-predict | world_predict called before action |
| post-recording | Reflexion and memory_store called |
| post-gate-tuner | Gate threshold adjustment after task |
| mcp-memory | memory_store/memory_retrieve called |
| mcp-world | world_query/world_update called |
| full-pipeline | Complete L1→L1.5→L2→L3→POST chain |
| edge-cases | Handles empty/long/special inputs |

## Phase 3: CI Integration

```yaml
# .github/workflows/test.yml
name: Brain Agent Tests
on: [push, pull_request]

jobs:
  static-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test tests/unit/ tests/circuits/ tests/integration/ tests/e2e/ tests/qc/
      - run: bun run typecheck

  behavioral-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: npx agentest run --config tests/behavioral/agentest.config.ts
        env:
          AGENTEST_ALLOW_PRIVATE_ENDPOINTS: 1
```

## Execution Order

```
Step 1: Create tests/tsconfig.json
Step 2: Port 5 example tests to .test.ts
Step 3: Create agentest.config.ts (root, already exists — update)
Step 4: Create all 28 Agentest scenario files
Step 5: Test locally with `bun test`
Step 6: Create .github/workflows/test.yml
Step 7: Final verification
```

## Files to Create

Total: ~35 files
- 5 ported .test.ts files
- 28 Agentest .sim.ts files
- 1 tsconfig.json
- 1 tsconfig.behavioral.json
- 1 .github/workflows/test.yml

## Verification

Each step passes:
- `bun test` → all tests green
- `npx agentest run` → all scenarios pass (from desktop)
- `bun run typecheck` → no type errors
