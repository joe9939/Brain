# Maslow Wave Three-Layer Integration

## TL;DR (For humans)

用连续 ODE 波模型替换二元 MaslowSystem，贯通 BrainAgent → WorldInterface → MCAdaptor。核心引擎已完成（maslow-wave.ts, wave-trigger-mapper.ts, wave-integration.ts），剩下 4 个集成任务需要 TDD 实现。

## Todos

- [x] Task A: Wire WaveIntegrator into BrainEngine

### Task A: Wire WaveIntegrator into BrainEngine

**Files:** `brain-engine/src/core/brain-engine.ts`, `brain-engine/test/brain-wave-integration.test.ts`

**References:** `maslow-wave.ts`, `wave-integration.ts`

**Acceptance:**
- `brain.waveIntegrator` is a `WaveIntegrator` instance
- After `handleTick(snapshot)`, wave state reflects snapshot data
- All existing tests still pass

**QA:** Run `brain-engine/test/brain-wave-integration.test.ts` + full regression suite

**Depends on:** Nothing (core engine done)

---

- [x] Task B: Inject Wave Dominant Into Hormone Context

### Task B: Inject Wave Dominant Into Hormone Context

**Files:** `brain-engine/src/core/brain-engine.ts`, `brain-engine/test/brain-wave-context.test.ts`

**References:** `brain-hormone.ts` (buildHormoneContext)

**Acceptance:**
- `contextInjector` callback includes `## Dominant Need` section
- Content reflects current `waveIntegrator.getDominant()`
- No regression on circuit integration tests

**QA:** Verify context string contains "Dominant Need" with correct level/intensity

**Depends on:** Task A

---

- [x] Task C: Wave-Aware Action Priority in MCAdaptor

### Task C: Wave-Aware Action Priority in MCAdaptor

**Files:** `adapter/minecraft/mc-act.ts`, `adapter/minecraft/test/wave-action.test.ts`

**References:** `wave-integration.ts`

**Acceptance:**
- `modulatePriority(action, dominant)` returns 1.0-1.5 based on need-action alignment
- L1 dominant → survival actions (seek_food, flee) boosted
- L2 dominant → safety actions (flee, build_shelter) boosted
- L5 dominant → exploration actions (wander, explore) boosted
- No dominant → no boost (1.0)

**QA:** Pure function tests, no mocks needed

**Depends on:** Nothing (pure function)

---

### Task D: WorldSnapshot Temporal Fields

**Files:** `world-interface/types.ts`, `adapter/minecraft/mc-perceive.ts`

**References:** `wave-trigger-mapper.ts`

**Acceptance:**
- `WorldSnapshot` has `threatTrend`, `timeSinceLastMeal` fields
- `mc-perceive.ts` populates these fields from tracked state
- `WaveTriggerMapper.healthDelta` works with new fields

**QA:** Verify new fields are populated correctly in test snapshots

- [x] Task D: WorldSnapshot Temporal Fields

**Depends on:** Task C
