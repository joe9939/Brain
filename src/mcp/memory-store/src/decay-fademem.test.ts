import { describe, test, expect } from 'bun:test';
import {
  adaptiveLambda, freqModulation, relModulation, tempModulation,
  applyDecay, DECAY_LAMBDAS,
} from './decay/index.js';
import { DEFAULT_FADEMEM_CONFIG } from './decay/constants.js';
import type { DecayContext } from './decay/index.js';

// ─── Group 1: freqModulation ───────────────────────────────────

describe('freqModulation', () => {
  test('returns 1.0 when accessCount is undefined (no modulation)', () => {
    expect(freqModulation()).toBe(1.0);
    expect(freqModulation(undefined)).toBe(1.0);
  });

  test('returns 1.3 when accessCount = 0 (max boost: 1 + 0.3 × e^0 = 1.3)', () => {
    expect(freqModulation(0)).toBeCloseTo(1.3, 5);
  });

  test('approaches 1.0 as accessCount grows (accessCount = 50 → ~1.002)', () => {
    const result = freqModulation(50);
    expect(result).toBeCloseTo(1.002, 2);
    expect(result).toBeGreaterThan(1.0);
    expect(result).toBeLessThan(1.01);
  });

  test('custom freq_decay_factor = 0.5 with accessCount = 0 → 1.5', () => {
    expect(freqModulation(0, { freq_decay_factor: 0.5 })).toBe(1.5);
  });

  test('custom freq_alpha accelerates decay toward 1.0', () => {
    // With larger alpha, the frequency benefit decays faster
    const result = freqModulation(5, { freq_alpha: 0.5 });
    // δ = 1 + 0.3 × exp(-0.5 × 5) = 1 + 0.3 × exp(-2.5) = 1 + 0.3 × 0.082085 ≈ 1.0246
    expect(result).toBeCloseTo(1.0246, 3);
  });
});

// ─── Group 2: relModulation ────────────────────────────────────

describe('relModulation', () => {
  test('returns 1.0 when no embeddings provided', () => {
    expect(relModulation()).toBe(1.0);
    expect(relModulation(undefined, undefined)).toBe(1.0);
  });

  test('returns 1.0 when only one embedding provided', () => {
    const emb = new Float32Array([1, 0, 0]);
    expect(relModulation(emb, undefined)).toBe(1.0);
    expect(relModulation(undefined, emb)).toBe(1.0);
  });

  test('identical embeddings → cosine = 1.0, γ = 1/(1+0.5×1) = 0.667', () => {
    const emb = new Float32Array([1, 0, 0]);
    const result = relModulation(emb, emb);
    expect(result).toBeCloseTo(0.667, 2);
  });

  test('orthogonal embeddings → cosine = 0.0, γ = 1.0', () => {
    const embA = new Float32Array([1, 0, 0]);
    const embB = new Float32Array([0, 1, 0]);
    expect(relModulation(embA, embB)).toBe(1.0);
  });

  test('opposite direction embeddings clamped to 0 cosine → γ = 1.0', () => {
    const embA = new Float32Array([1, 0, 0]);
    const embB = new Float32Array([-1, 0, 0]);
    // dot = -1, cosSim clamped to 0 → γ = 1/(1+0.5×0) = 1.0
    expect(relModulation(embA, embB)).toBe(1.0);
  });

  test('config override: relevance_beta = 1.0, identical embeddings → 1/(1+1×1) = 0.5', () => {
    const emb = new Float32Array([1, 0, 0]);
    expect(relModulation(emb, emb, { relevance_beta: 1.0 })).toBe(0.5);
  });
});

// ─── Group 3: tempModulation ───────────────────────────────────

describe('tempModulation', () => {
  test('returns 1.0 when hourOfDay is undefined (optional feature disabled)', () => {
    expect(tempModulation()).toBe(1.0);
    expect(tempModulation(undefined)).toBe(1.0);
  });

  test('at hour = 6 (sin(π/2) = 1) → τ = 1 + 0.1 × 1 = 1.1', () => {
    expect(tempModulation(6)).toBeCloseTo(1.1, 10);
  });

  test('at hour = 18 (sin(3π/2) = -1) → τ = 1 + 0.1 × (-1) = 0.9', () => {
    expect(tempModulation(18)).toBeCloseTo(0.9, 10);
  });

  test('at hour = 0 (sin(0) = 0) → τ = 1.0', () => {
    expect(tempModulation(0)).toBe(1.0);
  });

  test('at hour = 12 (sin(π) = 0) → τ = 1.0', () => {
    expect(tempModulation(12)).toBe(1.0);
  });

  test('custom temporal_amp = 0.2 doubles the modulation range', () => {
    expect(tempModulation(6, { temporal_amp: 0.2 })).toBeCloseTo(1.2, 10);
    expect(tempModulation(18, { temporal_amp: 0.2 })).toBeCloseTo(0.8, 10);
  });
});

// ─── Group 4: adaptiveLambda ───────────────────────────────────

describe('adaptiveLambda', () => {
  test('without context → equals base lambda for episodic (0.05)', () => {
    expect(adaptiveLambda('episodic')).toBeCloseTo(DECAY_LAMBDAS.episodic, 5);
  });

  test('without context → equals base lambda for all memory types', () => {
    for (const [type, expected] of Object.entries(DECAY_LAMBDAS)) {
      expect(adaptiveLambda(type)).toBeCloseTo(expected, 5);
    }
  });

  test('with all factors activated: accessCount=0, identical embeddings, hour=6', () => {
    const emb = new Float32Array([1, 0, 0]);
    const context: DecayContext = {
      accessCount: 0,
      embedding: emb,
      queryEmbedding: emb,
      hourOfDay: 6,
    };
    // δ = 1.3, γ ≈ 0.667, τ = 1.1
    // λ = 0.05 × 1.3 × 0.667 × 1.1 ≈ 0.0477
    const result = adaptiveLambda('episodic', context);
    expect(result).toBeCloseTo(0.0477, 3);
  });

  test('custom config disables frequency factor', () => {
    // Empty context {} → all context fields undefined → all factors default to 1.0
    // λ = 0.05
    expect(adaptiveLambda('episodic', {}, { freq_decay_factor: 0 })).toBeCloseTo(0.05, 5);
  });

  test('custom config disables relevance factor', () => {
    const emb = new Float32Array([1, 0, 0]);
    const context: DecayContext = { embedding: emb, queryEmbedding: emb };
    // relevance_beta = 0 → γ = 1/(1+0×1) = 1.0
    expect(adaptiveLambda('episodic', context, { relevance_beta: 0 })).toBeCloseTo(0.05, 5);
  });

  test('custom config disables temporal factor', () => {
    // temporal_amp = 0 → τ = 1.0 regardless of hour
    expect(adaptiveLambda('episodic', { hourOfDay: 6 }, { temporal_amp: 0 })).toBeCloseTo(0.05, 5);
  });
});

// ─── Group 5: applyDecay with context ──────────────────────────

describe('applyDecay with context', () => {
  test('3-arg backward compat: returns same exponential decay as before', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, 'episodic', past);
    const expected = Math.exp(-0.05 * 1);
    expect(result).toBeCloseTo(expected, 2);
  });

  test('5-arg with context produces a different (higher) score than 3-arg', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const emb = new Float32Array([1, 0, 0]);
    const context: DecayContext = {
      accessCount: 0,
      embedding: emb,
      queryEmbedding: emb,
      hourOfDay: 6,
    };
    const result3 = applyDecay(1.0, 'episodic', past);
    const result5 = applyDecay(1.0, 'episodic', past, context);
    // Adaptive factors should slow decay (higher retained score)
    expect(result5).not.toBeCloseTo(result3, 10);
    expect(result5).toBeGreaterThan(result3);
  });

  test('5-arg: episodic type works and produces reasonable score', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, 'episodic', past, {});
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1.0);
  });

  test('5-arg: procedural type works', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, 'procedural', past, {});
    expect(result).toBeGreaterThan(0);
  });

  test('5-arg: semantic type works', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, 'semantic', past, {});
    expect(result).toBeGreaterThan(0);
  });

  test('5-arg: working type works', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, 'working', past, {});
    expect(result).toBeGreaterThan(0);
  });

  test('5-arg: unknown type uses default lambda 0.1', () => {
    const past = new Date(Date.now() - 86400000 * 3).toISOString();
    const result3 = applyDecay(1.0, 'unknown_type', past);
    const result5 = applyDecay(1.0, 'unknown_type', past, {});
    // Both should be exp(-0.1 * 3) with context having no effect
    expect(result3).toBeCloseTo(result5, 10);
  });

  test('5-arg with config override changes decay rate', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const resultDefault = applyDecay(1.0, 'episodic', past, {});
    const resultSlower = applyDecay(1.0, 'episodic', past, { accessCount: 0 }, { freq_decay_factor: 1.0 });
    // freq_decay_factor = 1.0 means δ = 2.0 for accessCount = 0
    // λ = 0.05 * 2.0 = 0.1, so decay is faster, not slower
    // Actually: δ = 1 + 1.0 * exp(0) = 2.0
    // λ = 0.05 * 2.0 = 0.1
    // Result: exp(-0.1) < exp(-0.05), so resultSlower < resultDefault
    expect(resultSlower).toBeLessThan(resultDefault);
  });
});

// ─── Group 6: FadeMemConfig and DecayContext types ─────────────

describe('FadeMemConfig defaults', () => {
  test('DEFAULT_FADEMEM_CONFIG has expected default values', () => {
    expect(DEFAULT_FADEMEM_CONFIG.freq_decay_factor).toBe(0.3);
    expect(DEFAULT_FADEMEM_CONFIG.freq_alpha).toBe(0.1);
    expect(DEFAULT_FADEMEM_CONFIG.relevance_beta).toBe(0.5);
    expect(DEFAULT_FADEMEM_CONFIG.temporal_amp).toBe(0.1);
    expect(DEFAULT_FADEMEM_CONFIG.temporal_phase).toBe(0);
    expect(DEFAULT_FADEMEM_CONFIG.base_lambdas).toEqual(DECAY_LAMBDAS);
  });

  test('partial config merging works in freqModulation (only freq_alpha overridden)', () => {
    // freq_decay_factor uses default (0.3), freq_alpha overridden to 0.2
    const result = freqModulation(10, { freq_alpha: 0.2 });
    // δ = 1 + 0.3 × exp(-0.2 × 10) = 1 + 0.3 × exp(-2) ≈ 1 + 0.3 × 0.13534 ≈ 1.0406
    expect(result).toBeCloseTo(1.0406, 3);
  });

  test('partial config merging works in adaptiveLambda', () => {
    // Override only freq_decay_factor to 0.5, with accessCount = 0
    const result = adaptiveLambda('episodic', { accessCount: 0 }, { freq_decay_factor: 0.5 });
    // δ = 1 + 0.5 × exp(0) = 1.5, γ = 1.0, τ = 1.0
    // λ = 0.05 × 1.5 = 0.075
    expect(result).toBeCloseTo(0.075, 5);
  });

  test('DecayContext type accepts all optional fields', () => {
    const ctx: DecayContext = {};
    expect(ctx.accessCount).toBeUndefined();

    const fullCtx: DecayContext = {
      accessCount: 5,
      embedding: new Float32Array([0.1, 0.2]),
      queryEmbedding: new Float32Array([0.3, 0.4]),
      hourOfDay: 14,
    };
    expect(fullCtx.accessCount).toBe(5);
    expect(fullCtx.embedding).toBeInstanceOf(Float32Array);
    expect(fullCtx.queryEmbedding).toBeInstanceOf(Float32Array);
    expect(fullCtx.hourOfDay).toBe(14);
  });

  test('DECAY_LAMBDAS values are unchanged', () => {
    expect(DECAY_LAMBDAS).toEqual({
      episodic: 0.05,
      procedural: 0.15,
      semantic: 0.02,
      working: 0.3,
    });
  });
});
