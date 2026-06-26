import type { FadeMemConfig } from './constants.js';
import { DEFAULT_FADEMEM_CONFIG } from './constants.js';

/**
 * γ(relevance) — Semantic relevance modulation.
 *
 * Memories semantically relevant to the current context decay slower.
 *
 *     γ(relevance) = 1 / (1 + β × cosine_sim)
 *
 * Cosine similarity is clamped to [0, 1].
 * Returns 1.0 (no modulation) when either embedding is missing.
 */
export function relModulation(
  embedding?: Float32Array,
  queryEmbedding?: Float32Array,
  config?: Partial<FadeMemConfig>,
): number {
  if (!embedding || !queryEmbedding) return 1.0;
  const { relevance_beta } = { ...DEFAULT_FADEMEM_CONFIG, ...config };

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < embedding.length; i++) {
    dot += embedding[i] * queryEmbedding[i];
    normA += embedding[i] * embedding[i];
    normB += queryEmbedding[i] * queryEmbedding[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  const cosSim = Math.max(0, dot / denom);

  return 1 / (1 + relevance_beta * cosSim);
}
