# 🧠 Brain Engine v3 — Closed-Loop Brain Architecture

> 21 brain components · 13-module ComponentBus · Cognitive LLM broadcast · 102 TDD tests

**Brain Engine v3** is a biologically-plausible brain architecture implemented in Rust. Each component maps to a real brain region with a computational model grounded in peer-reviewed neuroscience papers. A `ComponentBus` broadcast system ensures bidirectional communication between all modules, and a cognitive LLM layer (via `rig-core`) serves as the global workspace — reading the bus, reasoning, and broadcasting decisions back to every component.

---

## Architecture

```
3 rounds convergence → Cognitive(LLM) broadcast → 2 rounds post-convergence

ComponentBus (13 modules read/write the bus)
  ├── P0 Neuromodulators  (Doya 2002: TD meta-learning γ/β/α)
  ├── P1 Hippocampus      (McClelland 1995: CLS pattern separation)
  ├── P2 Basal Ganglia    (Bogacz 2006: drift diffusion SDE)
  ├── P2.5 Cerebellum     (Ito 2006: LTD sequence learning)
  ├── P3 DMN              (Buckner 2008: counterfactual thinking)
  ├── P4 Wave             (ACT-R: spreading activation + propagation)
  ├── P5 Thalamus         (Sherman 2005: dual-mode gating)
  ├── P6 Interoception    (Seth 2013: predictive coding)
  ├── Emotion             (Barrett 2017: constructed emotion)
  ├── Hormone             (Sapolsky 2015: allostatic load)
  ├── Attention           (Itti 2001: saliency + biased competition)
  ├── Reflex              (Sherrington 1906: spinal hierarchy)
  └── Predictive          (Friston 2010: hierarchical predictive coding)
```

### Referenced Papers

| Component | Paper | Core Math |
|-----------|-------|-----------|
| P0 | Doya (2002) *Metalearning and neuromodulation* | TD meta-learning: γ=0.3+5HT·0.6, β=1.0+NE·5.0 |
| P2 | Bogacz (2006) *The physics of optimal decision making* | Drift diffusion: dx = A·dt + c·dW |
| P1 | McClelland (1995) *Complementary Learning Systems* | Sparse encoding + pattern separation |
| Emotion | Barrett (2017) *The theory of constructed emotion* | Core affect + concept construction |
| Predictive | Friston (2010) *The free-energy principle* | Hierarchical predictive coding + precision |
| Hormone | Sapolsky (2015) *Stress and the brain* | Allostatic load model |
| Attention | Itti & Koch (2001) *Computational modelling of visual attention* | Saliency map + biased competition |
| Habit | Daw et al. (2005) *Uncertainty-based competition* | Goal-directed ↔ Habitual control |
| Goal | Botvinick (2009) *Hierarchical models of behavior* | Hierarchical RL + gradient effect |
| Reflex | Sherrington (1906) *The integrative action of the nervous system* | Spinal reflex hierarchy |
| Reward | Schultz (1997) *A neural substrate of prediction and reward* | TD(λ) eligibility traces |
| P5 | Sherman (2005) *Thalamocortical loops* | Driver/Modulator dual mode |
| P6 | Seth (2013) *Interoceptive inference* | Predictive coding |
| P3 | Buckner (2008) *The brain's default network* | Counterfactual + autobiographical recall |

---

## Quick Start

```bash
cd brain-engine-rs

# Run all 102 tests
cargo test

# Use as a library
use brain_engine::brain::BrainEngine;
use brain_engine::bus::ComponentBus;

let mut brain = BrainEngine::new(config);
let result = brain.bus_tick(&snapshot).await;
```

---

## Project Structure

```
brain-engine-rs/
├── src/
│   ├── brain.rs          ← Orchestrator + convergence tick
│   ├── bus.rs            ← ComponentBus (13-module broadcast bus)
│   ├── llm.rs            ← Cognitive LLM layer (rig-core)
│   ├── types.rs          ← Core types
│   ├── modulator.rs      ← P0 Neuromodulators (Doya 2002)
│   ├── memory.rs         ← P1 Hippocampus (McClelland 1995)
│   ├── basal.rs          ← P2 Basal Ganglia (Bogacz 2006)
│   ├── cerebellum.rs     ← P2.5 Cerebellum (Ito 2006)
│   ├── dmn.rs            ← P3 DMN (Buckner 2008)
│   ├── wave.rs           ← P4 Wave (ACT-R)
│   ├── thalamus.rs       ← P5 Thalamus (Sherman 2005)
│   ├── interoception.rs  ← P6 Interoception (Seth 2013)
│   ├── emotion.rs        ← Emotion (Barrett 2017)
│   ├── hormone.rs        ← Hormone (Sapolsky 2015)
│   ├── attention.rs      ← Attention (Itti 2001)
│   ├── reflex.rs         ← Reflex (Sherrington 1906)
│   ├── predictive.rs     ← Predictive (Friston 2010)
│   ├── habit.rs          ← Habit (Daw 2005)
│   ├── goal.rs           ← Goal (Botvinick 2009)
│   ├── reward.rs         ← Reward (Schultz 1997)
│   ├── utils.rs
│   └── test_helpers.rs
├── Cargo.toml
└── RESEARCH.md
```

---

## Status

```
Tests:   102 ✅ (all passing)
Build:   ✅ (0 errors, 1 intentional warning)
Modules: 21 brain components
Bus:     13/13 with bus_tick
Coverage: TDD-driven, every component has failing-test-first
```

---

## Version History

- **v1** (archive branch): OpenCode plugin — 20 LLM agents via `task()`, 149 tests
- **v2** (archive branch): Standalone npm package — 20 parallel sessions, 550+ tests, signal competition + BG gating
- **v3** (current): Rust rewrite — 21 native modules, ComponentBus closed-loop architecture, 102 TDD tests, paper-grounded

---

## License

MIT
