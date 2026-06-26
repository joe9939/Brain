// ─── Backward-compatible API (unchanged signatures) ───
export { applyDecay, getDecayThreshold, DECAY_LAMBDAS } from './adaptive.js';

// ─── New FadeMem API ───
export { adaptiveLambda } from './adaptive.js';
export { freqModulation } from './frequency.js';
export { relModulation } from './relevance.js';
export { tempModulation } from './temporal.js';

// ─── Types ───
export type { FadeMemConfig, DecayContext } from './constants.js';
