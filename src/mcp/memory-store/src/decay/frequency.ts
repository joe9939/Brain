import type { FadeMemConfig } from './constants.js';
import { DEFAULT_FADEMEM_CONFIG } from './constants.js';

/**
 * δ(access) — Access-frequency modulation.
 *
 * Frequently-accessed memories decay slower.
 *
 *     δ(access) = 1 + freq_decay_factor × exp(-α × access_count)
 *
 * Returns 1.0 (no modulation) when accessCount is undefined.
 */
export function freqModulation(
  accessCount?: number,
  config?: Partial<FadeMemConfig>,
): number {
  if (accessCount === undefined) return 1.0;
  const { freq_decay_factor, freq_alpha } = { ...DEFAULT_FADEMEM_CONFIG, ...config };
  return 1 + freq_decay_factor * Math.exp(-freq_alpha * accessCount);
}
