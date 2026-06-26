/** FadeMem adaptive decay configuration. */
export interface FadeMemConfig {
  /** Max fractional boost from frequency modulation (default 0.3 = 30%). */
  freq_decay_factor: number;
  /** Decay rate of the frequency effect (default 0.1). */
  freq_alpha: number;
  /** Sensitivity to semantic relevance (default 0.5). */
  relevance_beta: number;
  /** Amplitude of circadian modulation ±τ (default 0.1 = ±10%). */
  temporal_amp: number;
  /** Phase offset for circadian sine wave (default 0, peak ~6am). */
  temporal_phase: number;
  /** Base decay rates per memory type. */
  base_lambdas: Record<string, number>;
}

/** Optional context passed to adaptive decay calculations. */
export interface DecayContext {
  /** Number of times the memory has been accessed. */
  accessCount?: number;
  /** Embedding vector of the stored memory. */
  embedding?: Float32Array;
  /** Embedding vector of the query / current context. */
  queryEmbedding?: Float32Array;
  /** Current hour of day (0-23) for circadian modulation. */
  hourOfDay?: number;
}

/** Base decay rates from the original fixed-exponential scheme. */
export const DECAY_LAMBDAS: Record<string, number> = {
  episodic: 0.05,
  procedural: 0.15,
  semantic: 0.02,
  working: 0.3,
};

/** Factory defaults for every FadeMem parameter. */
export const DEFAULT_FADEMEM_CONFIG: FadeMemConfig = {
  freq_decay_factor: 0.3,
  freq_alpha: 0.1,
  relevance_beta: 0.5,
  temporal_amp: 0.1,
  temporal_phase: 0,
  base_lambdas: DECAY_LAMBDAS,
};
