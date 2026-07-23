// Belief Store �?持久化信念存�?// 参�? predictive-mind §4.1 belief-store MCP
// 使用倒排索引 (tag �?beliefs) 加�?k-NN 检�?
import { Belief } from './types.js';

export interface BeliefStoreConfig {
  maxSize?: number;
}

export class BeliefStore {
  private beliefs: Belief[] = [];
  private tagIndex: Map<string, Set<string>> = new Map(); // tag �?belief IDs
  private maxSize: number;

  constructor(config: BeliefStoreConfig = {}) {
    this.maxSize = config.maxSize ?? 100;
  }

  /** 执行前记�?我预测会怎样" */
  storePrediction(context: string, prediction: any, confidence: number, tags: string[] = []): string {
    const id = `blf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const belief: Belief = {
      id,
      timestamp: Date.now(),
      context,
      prediction,
      outcome: null,
      surprise: 0,
      confidence,
      tags,
    };
    this.beliefs.push(belief);
    this.indexTags(belief);
    this.evictOldest();
    return id;
  }

  /** 执行后记�?实际怎样" + 误差 */
  recordObservation(beliefId: string, outcome: any, surprise: number): void {
    const belief = this.beliefs.find(b => b.id === beliefId);
    if (!belief) return;
    belief.outcome = outcome;
    belief.surprise = surprise;
    belief.confidence = Math.max(0, belief.confidence - surprise * 0.5);
  }

  /** �?context 检索信�?*/
  retrieveBeliefs(context: string): Belief[] {
    if (!context) return [...this.beliefs];
    return this.beliefs.filter(b => b.context.includes(context) || context.includes(b.context));
  }

  /** k-NN 检�?�?通过标签 */
  recallSimilar(context: string, k: number): Belief[] {
    // 先查 tag 索引
    const candidateIds = new Set<string>();
    for (const [tag, ids] of this.tagIndex) {
      if (context.includes(tag) || tag.includes(context)) {
        for (const id of ids) candidateIds.add(id);
      }
    }

    let candidates = this.beliefs.filter(b => candidateIds.has(b.id));
    if (candidates.length === 0) {
      // 回退: 全量模糊匹配
      candidates = this.beliefs.filter(b =>
        b.context.includes(context) || context.includes(b.context) ||
        b.tags.some(t => context.includes(t) || t.includes(context))
      );
    }

    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, k);
  }

  private indexTags(belief: Belief): void {
    for (const tag of belief.tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(belief.id);
    }
  }

  private evictOldest(): void {
    if (this.beliefs.length > this.maxSize) {
      this.beliefs.sort((a, b) => a.timestamp - b.timestamp);
      const removed = this.beliefs.shift()!;
      // 清理 tag 索引
      for (const tag of removed.tags) {
        this.tagIndex.get(tag)?.delete(removed.id);
        if (this.tagIndex.get(tag)?.size === 0) this.tagIndex.delete(tag);
      }
    }
  }
}
