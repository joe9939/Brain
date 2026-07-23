// Memory System �?§2.2: Full memory lifecycle
// Types: Sensory �?Short-term(working) �?Long-term(episodic/semantic/procedural)
// Lifecycle: Acquisition �?Encoding �?Consolidation �?Retrieval �?Forgetting

import { EpisodicMemory, SemanticMemory, SOP, MentalState } from './types.js';

export class MemorySystem {
  private episodicStore: EpisodicMemory[] = [];
  private semanticStore: SemanticMemory[] = [];
  private proceduralStore: SOP[] = [];
  private maxWorkingSize = 5;
  private maxEpisodicSize = 100;
  private consolidationInterval = 30000; // 30s

  // ─── Working Memory ───
  addToWorking(state: MentalState, item: string): void {
    state.mem.working.push(item);
    if (state.mem.working.length > this.maxWorkingSize) {
      this.consolidateToEpisodic(state);
      state.mem.working.shift();
    }
  }

  // ─── Episodic Memory (§2.2.3 Long-term) ───
  addEpisodic(memory: Omit<EpisodicMemory, 'id' | 'timestamp'>, hormone?: { modulateMemoryImportance(base: number): number }): EpisodicMemory {
    const baseImp = memory.importance ?? 0.5;
    const finalImportance = hormone ? hormone.modulateMemoryImportance(baseImp) : baseImp;
    const entry: EpisodicMemory = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...memory,
      importance: finalImportance,
      tags: memory.tags ?? [],
    };
    this.episodicStore.unshift(entry);
    if (this.episodicStore.length > this.maxEpisodicSize) {
      this.forgetLowImportance();
    }
    return entry;
  }

  retrieveEpisodic(query: string, k = 3): EpisodicMemory[] {
    const q = query.toLowerCase();
    return this.episodicStore
      .filter(m => m.content.toLowerCase().includes(q) || m.tags.some(t => t.includes(q)))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, k);
  }

  // ─── Semantic Memory (§2.2.3) ───
  addSemantic(concept: string, facts: string[], confidence = 0.5): SemanticMemory {
    const existing = this.semanticStore.find(s => s.concept === concept);
    if (existing) {
      existing.facts.push(...facts.filter(f => !existing.facts.includes(f)));
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      return existing;
    }
    const entry: SemanticMemory = {
      id: `sem-${Date.now()}`,
      concept,
      facts: [...new Set(facts)],
      confidence,
    };
    this.semanticStore.push(entry);
    return entry;
  }

  retrieveSemantic(concept: string): SemanticMemory | null {
    return this.semanticStore.find(s => s.concept.toLowerCase() === concept.toLowerCase()) ?? null;
  }

  // ─── Procedural Memory (SOPs) (§2.2.3 + §3.2) ───
  addSOP(sop: SOP): void {
    const existing = this.proceduralStore.find(s => s.id === sop.id);
    if (existing) {
      existing.frequency++;
      return;
    }
    sop.frequency = 1;
    this.proceduralStore.push(sop);
  }

  matchSOP(input: string): SOP | null {
    const q = input.toLowerCase();
    const matched = this.proceduralStore
      .filter(s => {
        if (s.trigger instanceof RegExp) return s.trigger.test(input);
        return q.includes(s.trigger.toLowerCase());
      })
      .sort((a, b) => b.frequency - a.frequency);
    return matched[0] ?? null;
  }

  // ─── Consolidation (§2.2.2 Memory Acquisition) ───
  private consolidateToEpisodic(state: MentalState): void {
    const workingCopy = [...state.mem.working];
    if (workingCopy.length === 0) return;
    this.addEpisodic({
      content: workingCopy.join('\n'),
      importance: 0.3,
      tags: ['working-memory', 'auto'],
    });
    // Extract semantic knowledge from working memory
    workingCopy.forEach(item => {
      const words = item.split(/\s+/).filter(w => w.length > 4);
      if (words.length > 0) {
        this.addSemantic(words[0], [item], 0.3);
      }
    });
  }

  // ─── Forgetting (§2.2.5 Selective Forgetting) ───
  private forgetLowImportance(): void {
    this.episodicStore.sort((a, b) => a.importance - b.importance);
    this.episodicStore.splice(0, Math.floor(this.maxEpisodicSize * 0.2));
  }

  forgetOld(daysOld = 7): void {
    const cutoff = Date.now() - daysOld * 86400000;
    this.episodicStore = this.episodicStore.filter(m => m.timestamp > cutoff);
  }

  // ─── Utility ───
  stats(): { working: number; episodic: number; semantic: number; procedural: number } {
    return {
      working: 0, // reported via state
      episodic: this.episodicStore.length,
      semantic: this.semanticStore.length,
      procedural: this.proceduralStore.length,
    };
  }

  /** Get all episodic memories (for testing and inspection). */
  getEpisodicMemories(): EpisodicMemory[] {
    return [...this.episodicStore];
  }
}
