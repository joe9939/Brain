/**
 * FadeMem adaptive decay — 4-factor exponential forgetting.
 *
 * Architecture:
 *   decay/constants.ts   — Types (FadeMemConfig, DecayContext) + base parameters
 *   decay/adaptive.ts    — λ_adaptive, applyDecay, getDecayThreshold
 *   decay/frequency.ts   — δ(access): access-frequency modulation
 *   decay/relevance.ts   — γ(relevance): semantic relevance modulation
 *   decay/temporal.ts    — τ(hour): circadian temporal modulation
 *   decay/index.ts       — Unified public API (this file re-exports from it)
 *
 * All backwards-compatible exports (applyDecay, getDecayThreshold, DECAY_LAMBDAS)
 * are available at this same import path.
 */
export * from './decay/index.js';
