<div align="center">

# 🧠 Brain Engine

**Brain-inspired multi-agent system** — 20 parallel brain regions, 7 competing signals, basal ganglia gating.

[![CI](https://github.com/joe9939/Brain/actions/workflows/test.yml/badge.svg)](https://github.com/joe9939/Brain/actions)
[![npm version](https://img.shields.io/badge/npm-brain--engine-blue)](https://www.npmjs.com/package/brain-engine)
[![Tests](https://img.shields.io/badge/Tests-550%2B-brightgreen)]()
[![arXiv](https://img.shields.io/badge/arXiv-2504.01990-b31b1b)](https://arxiv.org/abs/2504.01990)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br>

> **🎮 [Live Visualizer](https://joe9939.github.io/Brain/)** — 3D brain activity viewer
> **💬 [Playground](https://joe9939.github.io/Brain/playground.html)** — chat with Brain Engine in browser

---

> **Standalone library** — no platform dependency. Runs anywhere Node.js runs.  
> OpenCode plugin (v1) maintained separately — see [v1 section](#v1-opencode-plugin).

---

</div>

## 📦 Install

```bash
npm install brain-engine
```

Requires Node.js 18+ and a DeepSeek (or OpenAI-compatible) API key.

## 🚀 Quick Start

```typescript
import { BrainEngine } from 'brain-engine';

const brain = new BrainEngine({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-flash',
});

const result = await brain.process('What is the capital of France?');
console.log(result.output);
// → "The capital of France is Paris."
```

**What happens internally:**

1. **5 L1 perception agents** fire in parallel (thalamus, amygdala, hippocampus, world-cortex, safety)
2. **5 evaluation agents** compute signal strengths (cerebellum, basal-ganglia, insula, attention, reward)
3. **7 signals compete** — the winner gates which tools are allowed
4. **Output routing** — the winning signal's component produces the final response

All this is hidden from the user — you see only `input → output`.

---

## 🧬 How It Works

### 20 Brain-Region Components

| Layer | Components | Function |
|-------|-----------|----------|
| **L1 Perception** (§2.1) | thalamus, amygdala, hippocampus, world-cortex, safety | 5 agents fire in parallel on every input |
| **Evaluation** (§2.7) | cerebellum, basal-ganglia, insula, attention, reward | Signal strength computation |
| **Regulation** (§3) | dmn, hypothalamus, self-optimizer, offline-consol, self-enhance | Long-term learning & balance |
| **Swarm** (§2.7) | dlpfc (planner), motor-cortex (executor), anterior-cingulate (reviewer), orbitofrontal (evaluator) | Complex task decomposition |
| **Synthesis** | brain | Final output synthesis |

### 7 Competing Signals

```
                    ┌──────────────────┐
                    │   perceive  (×5) │ ◄── L1 not done? Perceive wins
                    │   emotion   (×4) │ ◄── CAUTION/URGENT? Emotion boosts
Input ───────────→  │   safety    (×4) │ ◄── Danger detected? Safety gates up
                    │   memory    (×3) │ ◄── SOPs found? Memory retrieves
                    │   reward    (×3) │ ◄── Score low? Deep reasoning
                    │   action    (×2) │ ◄── Complex task? Swarm executes
                    │   learning  (×1) │ ◄── Task done? Reflect & learn
                    └────────┬─────────┘
                             │ strongest wins
                             ▼
                    ┌──────────────────┐
                    │  Basal Ganglia   │ ◄── Winner gates allowed tools
                    │  Go / NoGo       │
                    └──────────────────┘
```

**Winner** = `raw × priority`. Like a real brain, the strongest signal determines what happens next.

### Core Mental State

Every message updates the internal state `M_t = {M^mem, M^wm, M^emo, M^goal, M^rew, M^hormone}`:

| Component | Type | Description |
|-----------|------|-------------|
| M^mem | MemoryState | Working, episodic, semantic, procedural memory |
| M^wm | WorldModelState | Environment tracking & predictions |
| M^emo | EmotionState | 5 modes: NORMAL / CAUTION / URGENT / EXPLORE / SUPPORT |
| M^goal | GoalState | Active & completed goals |
| M^rew | RewardState | Extrinsic + intrinsic reward, TD error |
| M^hormone | HormoneState | **6 hormones** — adrenaline, cortisol, endorphin, dopamine, serotonin, oxytocin |

### Hormone System (NEW — 全局调制器)

Hormones modulate all subsystems simultaneously, just like a real brain:

```
Emotion → Hormone → Reflex(阈值↓/↑) → Predictive(阈值↓/↑) → Memory(重要性↑)
```

| Hormone | Trigger | Effect |
|---------|---------|--------|
| **Adrenaline** | URGENT mode | ↑ reflex sensitivity, ↑ memory encoding, ↓ serotonin |
| **Cortisol** | CAUTION (chronic) | ↑ predictive sensitivity (more alert), slow decay |
| **Endorphin** | Reward success | ↑ relaxation, ↓ cortisol, ↓ reflex sensitivity |
| **Dopamine** | Baseline 0.5 | Motivation from goal progress |
| **Serotonin** | Baseline 0.5 | Wellbeing, depleted by adrenaline |
| **Oxytocin** | SUPPORT mode | Social bonding, medium decay |

### Streaming Tick Architecture

Brain Engine v2 now supports a **50ms tick loop** for stream/real-time scenarios (games, robotics, continuous monitoring):

```
50ms tick ──→ ReflexRegistry (pluggable handlers)
              │ SurvivalReflex (Minecraft survival)
              │ CodingReflex (G1-G7, existing)
              │ No reflex?
              ├─→ PredictiveLayer (PhysicsPredictor)
              │   │ Prediction matches? → ✅ free pass (0 LLM)
              │   │ Mismatch?
              │   └─→ HabitLayer (online learning)
              │       │ Known pattern? → auto-execute
              │       │ Unknown?
              │       └─→ Cognitive (LLM, async, non-blocking)
              │
              StateEvolution runs in background (emotion decay, homeostasis)
```

- **`brain.tick(snapshot)`** — synchronous processing, returns within 50ms
- **`brain.start(worldInterface)` / `brain.stop()`** — manage the loop
- **`PredictionEngine`** interface — swap `PhysicsPredictor` (now) for `LatentPredictor` (later)
- **`ReflexHandler`** interface — plug Minecraft survival, coding safety, or custom reflexes

---

## 🧪 Test Suite

**23 test files · 550+ tests · 0 failures**

| Category | Tests | Status |
|----------|:-----:|:------:|
| Component Definitions | 176 | ✅ |
| Emotion Engine | 29 | ✅ |
| Goal System | 32 | ✅ |
| Memory System | 32 | ✅ |
| Reward System | 24 | ✅ |
| World Model | 17 | ✅ |
| Session Pool | 17 | ✅ |
| Basal Ganglia | 10 | ✅ |
| Persistence | 14 | ✅ |
| Brain Architecture | 22 | ✅ |
| Pathway Activation | 21 | ✅ |
| Full Pathways | 30 | ✅ |
| Output Router | 11 | ✅ |
| Brain Engine Integration | 15 | ✅ |
| Package Config | 16 | ✅ |
| Barrel Exports | 13 | ✅ |
| **Reflex Arc** (NEW) | 20 | ✅ |
| **Predictive Layer** (NEW) | 15 | ✅ |
| **Belief Store** (NEW) | 18 | ✅ |
| **State Evolution** (NEW) | 10 | ✅ |
| **Habit Layer** (NEW) | 13 | ✅ |
| **Brain Loop** (NEW) | 10 | ✅ |

```bash
# Run all static tests (no API key needed)
cd brain-engine
npx tsx test/components.test.ts
npx tsx test/emotion.test.ts
npx tsx test/goal.test.ts
# ... (any test file)

# Run integration tests (requires DEEPSEEK_API_KEY)
npx tsx test/brain-engine.test.ts
npx tsx test/pathways.test.ts
```

---

## 🖥️ Visualizer & Playground

**Live on GitHub Pages:** [https://joe9939.github.io/Brain/](https://joe9939.github.io/Brain/)

- **3D Brain Visualizer** — real-time connectome with signal bars, pathway tracing, mood display
- **Playground** — chat with Brain Engine directly in browser ([playground](https://joe9939.github.io/Brain/playground.html))

The visualizer runs in **demo mode** automatically (no backend needed). For real data:

```bash
node adapter/openai-server.mjs
# → Visualizer: http://localhost:3458
# → Playground: http://localhost:3458/
```

---

## 📦 API Reference

### `BrainEngine`

```typescript
class BrainEngine {
  constructor(config: {
    apiKey: string;
    baseUrl: string;
    model: string;
    persistencePath?: string;
  });

  async process(input: string): Promise<{
    output: string;
    gate: GateResult;
    signals: SignalResult[];
    outputRouter: OutputRouter;
  }>;

  state: MentalState;
  readonly basalGanglia: BasalGanglia;
  readonly memory: MemorySystem;
  readonly emotion: EmotionEngine;
  readonly reward: RewardSystem;
  readonly goals: GoalSystem;
}
```

### OpenAI-Compatible Adapter

```bash
node adapter/openai-server.mjs
# → http://localhost:3458/v1/chat/completions
```

Works with any OpenAI SDK client. The brain processes messages internally and returns responses through the standard chat completions API.

---

## 📁 Project Structure

```
brain-agent/
├── brain-engine/           ← Core library (npm package)
│   ├── src/core/           ← 12 modules: engine, memory, emotion, etc.
│   ├── test/               ← 17 test files
│   └── dist/               ← Compiled output (tsc)
├── adapter/                ← OpenAI-compatible API server
├── visualizer/             ← 3D real-time visualizer
├── src/                    ← v1 OpenCode plugin (legacy)
├── tests/                  ← v1 tests (legacy)
└── .github/workflows/      ← CI
```

---

## 🧠 v1: OpenCode Plugin

The original Brain Agent was an **OpenCode plugin** — a set of brain-mapped agents that run inside OpenCode's task system. v1 is maintained in this same repository under `src/` and `tests/`.

| | v1 (legacy) | v2 (current) |
|---|---|---|
| **Type** | OpenCode plugin | Standalone npm package |
| **Install** | `node install.js` | `npm install brain-engine` |
| **Run** | Inside OpenCode chatbot | `brain.process(input)` |
| **Architecture** | Hooks + MCP servers | Full engine with session pool |
| **Components** | 20 agents via task() | 20 in-process parallel sessions |
| **Tests** | 149 (v1 runner) | 470+ (tsx per file) |

v1 is stable and continues to work. All new development is on v2.

---

## 🔗 Related Resources

- [arXiv 2504.01990](https://arxiv.org/abs/2504.01990) — Advances and Challenges in Foundation Agents
- [ARCHITECTURE-v2.md](ARCHITECTURE-v2.md) — Full architecture documentation
- [PAPER-VERIFICATION.md](PAPER-VERIFICATION.md) — Paper alignment checklist
- [MEMORY-GAP.md](MEMORY-GAP.md) — Known gaps vs. biological brain

---

## 📄 License

[MIT](LICENSE) © 2026 Joe Wong
