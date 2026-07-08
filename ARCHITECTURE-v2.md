# 🧠 Brain Agent v2 Architecture

## Design Principles

1. **No platform dependency** — runs anywhere Node.js runs
2. **Each brain region has its own LLM session** — true parallel, non-blocking
3. **Four processing layers** — Reflex (0 LLM) → Prediction (0 LLM) → Habit (0 LLM) → Cognition (LLM)
4. **Pluggable adapters** — OpenAI API / Minecraft / Robotics
5. **Black box to the user** — only input/output visible, internal processing hidden

## Overall Architecture

```
                    ┌──────────────────────────┐
                    │       INPUT              │
                    │  (from any adapter)      │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   0. HORMONE SYSTEM       │
                    │   Global modulator        │
                    │   - adrenaline/cortisol   │
                    │   - endorphin/dopamine    │
                    │   - serotonin/oxytocin    │
                    │   Affects: reflex threshold│
                    │   prediction sensitivity  │
                    │   memory encoding         │
                    │   emotion decay rate      │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   ① REFLEX LAYER          │
                    │   0 LLM, <1ms             │
                    │   ReflexRegistry (pluggable)│
                    │   - CodingReflex (G1-G7)  │
                    │   - SurvivalReflex (MC)   │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   ② PREDICTIVE LAYER      │
                    │   0 LLM, <1ms             │
                    │   PredictionEngine (swappable)│
                    │   - PhysicsPredictor (now)│
                    │   - LatentPredictor (future)│
                    │   Surprise < threshold?   │
                    │   → free pass ✅ (95%+)   │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   ③ HABIT LAYER           │
                    │   0 LLM, ~10ms            │
                    │   HabitLayer (online learning)│
                    │   - frequency tracking    │
                    │   - success rate          │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   ④ COGNITIVE LAYER       │
                    │   LLM, ~2-5s (async)      │
                    │   5 L1 perception (parallel)│
                    │   5 evaluation (parallel) │
                    │   7 signal competition    │
                    │   LLM synthesis → output  │
                    └──────────────────────────┘
```

## Core Components (19 Modules)

### Original (12)

| Module | File | Description |
|--------|------|-------------|
| Brain Engine | `brain-engine.ts` | Main orchestrator: process + tick/start/stop |
| Basal Ganglia | `basal-ganglia.ts` | 7-signal competition + Go/NoGo gating |
| Brain Components | `brain-components.ts` | 20 brain region definitions |
| Session Pool | `session-pool.ts` | Parallel LLM session management |
| Memory | `memory.ts` | Working/episodic/semantic/procedural |
| Emotion | `emotion.ts` | 5-mode emotion + VAD + hormone modulation |
| Reward | `reward.ts` | Extrinsic/intrinsic + TD error |
| Goal | `goal.ts` | Goal lifecycle management |
| World Model | `world-model.ts` | Environment state tracking |
| Persistence | `persistence.ts` | SQLite persistent storage |
| LLM Client | `llm-client.ts` | DeepSeek/OpenAI API client |
| Types | `types.ts` | All TypeScript interfaces |

### Streaming Layer (6)

| Module | File | Description |
|--------|------|-------------|
| Reflex Arc | `reflex-arc.ts` | SurvivalReflex + ReflexRegistry, hormone-modulated |
| Predictive Layer | `predictive-layer.ts` | PhysicsPredictor + surprise computation, hormone-modulated |
| Belief Store | `belief-store.ts` | Persistent belief storage with inverted index |
| State Evolution | `state-evolution.ts` | Idle state decay, hormone-modulated emotion regression |
| Habit Layer | `habit-layer.ts` | Online habit learning, frequency/success tracking |
| Brain Loop | `brain-loop.ts` | 50ms tick scheduler with WorldInterface |

### Hormone System (1)

| Module | File | Description |
|--------|------|-------------|
| Hormone System | `brain-hormone.ts` | 6 hormones, 3 modulation methods |

## Mental State

```
M_t = { mem, wm, emo, goal, rew, hormone }
```

| Component | Type | Source |
|-----------|------|--------|
| M^mem | MemoryState | Working/episodic/semantic/procedural |
| M^wm | WorldModelState | Environment tracking |
| M^emo | EmotionState | 5 modes + VAD dimensions |
| M^goal | GoalState | Active/completed goals |
| M^rew | RewardState | Score/TD error/history |
| M^hormone | HormoneState | 6 global modulators |

## Hormone System

### Triggers → Effects

| Hormone | Trigger | Effect |
|---------|---------|--------|
| Adrenaline ↑ | URGENT mode | Reflex threshold ↓, memory importance ↑, serotonin ↓ |
| Cortisol ↑ | CAUTION (chronic) | Prediction threshold ↓ (more alert), slow decay |
| Endorphin ↑ | Reward success | Cortisol ↓, emotion decay ↑ (relax), prediction threshold ↑ |
| Dopamine | Baseline 0.5 | Motivation from goal progress |
| Serotonin | Baseline 0.5 | Wellbeing, depleted by adrenaline |
| Oxytocin ↑ | SUPPORT mode | Social bonding, medium decay |

### Modulation Chain

```
Emotion → Hormone → Reflex(threshold) → Prediction(threshold) → Memory(importance)
                                             ↓
                                     Emotion decay (feedback)
```

## Data Flow: One tick (50ms)

```
perceive()
   ↓
Hormone.tick(emotion, reward)
   ↓
ReflexRegistry.check(snapshot, hormone)
   → reflex? → act() → done
   ↓ (no reflex)
PredictiveLayer.tick(snapshot)
   → surprise < threshold? → done (free pass)
   → surprise > threshold?
   ↓
HabitLayer.match(state)
   → habit found? → act() → done
   → no habit?
   ↓
Cognitive (async, non-blocking)
   → memory retrieval (episodic + semantic + working)
   → 10 components parallel
   → signal competition
   → LLM synthesis
   ↓
StateEvolution.tick(state, dt, hormone)
```

## External Interfaces

| Interface | Method | Use Case |
|-----------|--------|----------|
| `process(input)` | One-shot Q&A | Chat, coding assistant |
| `tick(snapshot)` | Streaming loop | Minecraft, robotics |
| `start(world)` | Continuous loop | Autonomous agents |
| `POST /v1/chat/completions` | HTTP API | AI Clinic, OpenCode |

## Adapters

```
adapter/
├── openai-server.mjs    ← OpenAI-compatible HTTP API
└── minecraft/           ← Minecraft adapter
    ├── mc-perceive.ts   Mineflayer → WorldSnapshot
    ├── mc-act.ts        Action → Mineflayer
    └── index.ts         mcBot() entry point
```

## Test Suite (28 files, 0 failures)

| Category | Tests | API Key |
|----------|:-----:|:--------:|
| Static (core modules) | 19 files | ❌ No |
| Integration (end-to-end) | 7 files | ✅ Yes |

## Comparison: v1 vs v2

| | v1 (legacy) | v2 (current) |
|---|---|---|
| Type | OpenCode plugin | Standalone npm package |
| Processing | Event-driven (on user input) | Streaming (50ms tick) |
| Layers | 3: reflex/habit/cognitive | 4: + predictive layer |
| Hormone system | ❌ | ✅ 6 hormones |
| Active memory query | ❌ | ✅ episodic + semantic injection |
| Prediction engine | ❌ | ✅ PhysicsPredictor (swappable) |
| Minecraft adapter | ❌ | ✅ see adapter/minecraft/ |
| External API | OpenCode plugin API | OpenAI-compatible HTTP |
