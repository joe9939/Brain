// Ollama vector embedding client — zero npm deps (uses fetch)
// Falls back gracefully when Ollama is offline.
// Model: bge-small-en-v1.5 (33MB, 384-dim, CPU) or nomic-embed-text

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

interface LRUCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
}

function createLRU<V>(max: number): LRUCache<string, V> {
  const cache = new Map<string, V>();
  return {
    get(k) { const v = cache.get(k); if (v !== undefined) cache.delete(k), cache.set(k, v); return v; },
    set(k, v) { if (cache.size >= max) { const first = cache.keys().next(); if (!first.done) cache.delete(first.value); } cache.set(k, v); },
    has(k) { return cache.has(k); },
  };
}

const embedCache = createLRU<number[]>(100);

async function ollamaEmbed(texts: string[]): Promise<number[][] | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: texts }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { embeddings: number[][] };
    return data.embeddings;
  } catch {
    return null; // Ollama offline or timeout → graceful fallback
  }
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const cached = embedCache.get(text);
  if (cached) return cached;

  const result = await ollamaEmbed([text]);
  if (!result || !result[0]) return null;

  embedCache.set(text, result[0]);
  return result[0];
}

export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const uncached: number[] = [];
  const results: (number[] | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i++) {
    const cached = embedCache.get(texts[i]);
    if (cached) results[i] = cached;
    else uncached.push(i);
  }

  if (uncached.length === 0) return results;

  const batch = await ollamaEmbed(uncached.map(i => texts[i]));
  if (batch) {
    for (let j = 0; j < batch.length; j++) {
      const idx = uncached[j];
      results[idx] = batch[j];
      embedCache.set(texts[idx], batch[j]);
    }
  }

  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function isOllamaAvailable(): Promise<boolean> {
  return fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) })
    .then(r => r.ok).catch(() => false);
}
