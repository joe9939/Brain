import type { FadeMemConfig } from './constants.js';
import { DEFAULT_FADEMEM_CONFIG } from './constants.js';

/**
 * τ(hour) — Circadian temporal modulation (OPTIONAL).
 *
 * Decay oscillates with a ~24h rhythm, simulating consolidation windows.
 *
 *     τ(hour) = 1 + temporal_amp × sin(2π × (hour - phase) / 24)
 *
 * Returns 1.0 (no modulation) when hourOfDay is undefined.
 * With defaults: peak ~6am (+10%), trough ~6pm (-10%).
 */
export function tempModulation(
  hourOfDay?: number,
  config?: Partial<FadeMemConfig>,
): number {
  if (hourOfDay === undefined) return 1.0;
  const { temporal_amp, temporal_phase } = { ...DEFAULT_FADEMEM_CONFIG, ...config };
  return 1 + temporal_amp * Math.sin((2 * Math.PI * (hourOfDay - temporal_phase)) / 24);
}
