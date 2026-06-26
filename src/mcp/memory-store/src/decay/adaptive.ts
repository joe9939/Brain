import { DECAY_LAMBDAS, DEFAULT_FADEMEM_CONFIG } from './constants.js';
import type { DecayContext, FadeMemConfig } from './constants.js';
import { freqModulation } from './frequency.js';
import { relModulation } from './relevance.js';
import { tempModulation } from './temporal.js';

// Re-export for backward compatibility.
export { DECAY_LAMBDAS };

/**
 * λ_adaptive — Composite adaptive decay rate.
 *
 *     λ_adaptive = λ_base × δ(access) × γ(relevance) × τ(temporal)
 *
 * Each factor defaults to 1.0 when its context is unavailable, so the
 * function degrades gracefully to the base exponential decay.
 */
export function adaptiveLambda(
  type: string,
  context?: DecayContext,
  config?: Partial<FadeMemConfig>,
): number {
  const merged = { ...DEFAULT_FADEMEM_CONFIG, ...config };
  const baseLambda = merged.base_lambdas[type] ?? 0.1;

  const delta = freqModulation(context?.accessCount, merged);
  const gamma = relModulation(context?.embedding, context?.queryEmbedding, merged);
  const tau = tempModulation(context?.hourOfDay, merged);

  return baseLambda * delta * gamma * tau;
}

/**
 * Apply FadeMem adaptive exponential decay to a memory score.
 *
 * @param score       Current relevance score (0-1).
 * @param type        Memory type key ('episodic', 'procedural', 'semantic', 'working').
 * @param lastAccessed ISO-8601 timestamp of last access.
 * @param context     Optional DecayContext for adaptive factors.
 * @param config      Optional partial FadeMemConfig overrides.
 *
 * Backward-compatible: calling with 3 arguments produces the original
 * fixed-exponential behavior (all adaptive factors default to 1.0).
 */
export function applyDecay(
  score: number,
  type: string,
  lastAccessed: string,
  context?: DecayContext,
  config?: Partial<FadeMemConfig>,
): number {
  const lambda = adaptiveLambda(type, context, config);
  const lastAccess = new Date(lastAccessed).getTime();
  const now = Date.now();
  const daysSince = (now - lastAccess) / (1000 * 60 * 60 * 24);
  return score * Math.exp(-lambda * daysSince);
}

/**
 * Return an ISO-8601 threshold date `days` ago (default 30).
 *
 * Used to filter memories that have decayed below a retention floor.
 */
export function getDecayThreshold(days: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
