import { Database } from './compat.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MemoryType, RelationType, MemoryEntry, RetrievalResult } from './types.js';
import { applyDecay } from './decay.js';
import { getEmbedding, cosineSimilarity, isOllamaAvailable } from './embedding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'memory', 'memory.db');

export class MemoryStore {
  private db: Database.Database;
  private stmts: Map<string, Database.Statement> = new Map();
  private _ollamaAvail: boolean | null = null;

  private static readonly SIMILARITY_MERGE_THRESHOLD = 0.85;
  private static readonly SIMILARITY_CONFLICT_THRESHOLD = 0.50;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
    // Async check — will be lazily resolved on first hybrid/vector search
    isOllamaAvailable().then(avail => { this._ollamaAvail = avail; });
  }

  get ollamaAvailable(): boolean { return this._ollamaAvail === true; }

  private init(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
    this._migrate();
  }

  /** Apply backward-compatible ALTER TABLE migrations for existing databases. */
  private _migrate(): void {
    const migrations: string[] = [
      // episodic + semantic already have last_accessed & access_count; add importance + archived
      `ALTER TABLE episodic_memory ADD COLUMN importance REAL DEFAULT 1.0`,
      `ALTER TABLE episodic_memory ADD COLUMN archived INTEGER DEFAULT 0`,
      `ALTER TABLE semantic_memory ADD COLUMN importance REAL DEFAULT 1.0`,
      `ALTER TABLE semantic_memory ADD COLUMN archived INTEGER DEFAULT 0`,
      // procedural — add everything missing
      `ALTER TABLE procedural_memory ADD COLUMN importance REAL DEFAULT 1.0`,
      `ALTER TABLE procedural_memory ADD COLUMN archived INTEGER DEFAULT 0`,
      `ALTER TABLE procedural_memory ADD COLUMN last_accessed TEXT`,
      `ALTER TABLE procedural_memory ADD COLUMN access_count INTEGER DEFAULT 0`,
      // working — add everything missing
      `ALTER TABLE working_memory ADD COLUMN importance REAL DEFAULT 1.0`,
      `ALTER TABLE working_memory ADD COLUMN archived INTEGER DEFAULT 0`,
      `ALTER TABLE working_memory ADD COLUMN last_accessed TEXT`,
      `ALTER TABLE working_memory ADD COLUMN access_count INTEGER DEFAULT 0`,
    ];
    for (const stmt of migrations) {
      try { this.db.exec(stmt); } catch { /* column already exists — safe to ignore */ }
    }
  }

  private prepare(sql: string): Database.Statement {
    if (!this.stmts.has(sql)) {
      this.stmts.set(sql, this.db.prepare(sql));
    }
    return this.stmts.get(sql)!;
  }

  insert(type: MemoryType, key: string, content: string, tags: string[] = []): void {
    const table = `${type}_memory`;
    const existing = this.prepare(`SELECT id, content FROM ${table} WHERE id = ?`).get(key) as any;

    if (existing) {
      const similarity = this._computeSimilarity(existing.content, content);

      if (similarity > MemoryStore.SIMILARITY_MERGE_THRESHOLD) {
        // 🔄 MERGE: Content is very similar — update with new info
        this._logHistory(key, type, existing.content, content, 'merge');
        this._updateMemory(type, key, content, tags);
      } else if (similarity > MemoryStore.SIMILARITY_CONFLICT_THRESHOLD) {
        // ⚠️ CONFLICT: Related but different — log conflict, update anyway
        this._logHistory(key, type, existing.content, content, 'conflict');
        this._updateMemory(type, key, content, tags);
      } else {
        // 🔀 DIVERGE: Very different — create new memory with generated-id suffix
        const divergentKey = `${key}_v${Date.now()}`;
        this._logHistory(divergentKey, type, existing.content, content, 'divergent');
        this._insertNew(type, divergentKey, content, tags);
        // Link the divergent memory to the original
        this._createRelation(divergentKey, type, key, 'divergent_copy', 0.3);
      }
    } else {
      this._insertNew(type, key, content, tags);
    }

    // Try async vector embedding (fire and forget — won't block)
    this.tryStoreEmbedding(type, key, content).catch(() => {});
  }

  // ─── Conflict Resolution Helpers ───

  private _computeSimilarity(a: string, b: string): number {
    // Use embedding cosine similarity if available
    // Fall back to Jaccard word-overlap similarity
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size === 0 ? 1.0 : intersection.size / union.size;
  }

  private _logHistory(memoryId: string, type: string, oldContent: string, newContent: string, reason: string): void {
    this.prepare(
      'INSERT INTO memory_history (memory_id, memory_type, old_content, new_content, change_reason) VALUES (?, ?, ?, ?, ?)'
    ).run(memoryId, type, oldContent, newContent, reason);
  }

  private _updateMemory(type: string, key: string, content: string, tags: string[]): void {
    const table = `${type}_memory`;
    this.prepare(`UPDATE ${table} SET content = ?, tags = ?, last_accessed = datetime('now') WHERE id = ?`)
      .run(content, JSON.stringify(tags), key);
  }

  private _insertNew(type: string, key: string, content: string, tags: string[]): void {
    const table = `${type}_memory`;
    this.prepare(`INSERT INTO ${table} (id, content, tags, last_accessed) VALUES (?, ?, ?, datetime('now'))`)
      .run(key, content, JSON.stringify(tags));
  }

  private _createRelation(from: string, fromType: string, to: string, relation: string, strength: number): void {
    this.prepare(
      'INSERT INTO memory_relations (from_key, to_key, relation_type, strength) VALUES (?, ?, ?, ?)'
    ).run(from, to, relation, strength);
  }

  private async tryStoreEmbedding(type: MemoryType, key: string, content: string): Promise<void> {
    const table = `${type}_memory`;
    // Only episodic and semantic get embeddings
    if (type !== 'episodic' && type !== 'semantic') return;
    if (!this._ollamaAvail) return;

    const emb = await getEmbedding(content);
    if (!emb) return;

    const buf = Buffer.from(new Float32Array(emb).buffer);
    this.prepare(`UPDATE ${table} SET embedding = ? WHERE id = ?`).run(buf, key);
  }

  search(query: string, type: string = 'all', k: number = 5, mode: string = 'keyword'): RetrievalResult[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (keywords.length === 0) return [];

    const tables = type === 'all'
      ? ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory']
      : [`${type}_memory`];

    let results: RetrievalResult[] = [];

    if (mode === 'vector' && this._ollamaAvail) {
      results = this.vectorSearch(query, tables, k);
    } else if (mode === 'hybrid' && this._ollamaAvail) {
      results = this.hybridSearch(query, keywords, tables, k);
    } else {
      results = this.keywordSearch(keywords, tables, k);
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  private keywordSearch(keywords: string[], tables: string[], k: number): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    for (const table of tables) {
      const memType = table.replace('_memory', '') as MemoryType;
      const rows = this.prepare(
        `SELECT * FROM ${table} WHERE active = 1 AND archived = 0 AND (${keywords.map(() => 'LOWER(content) LIKE ?').join(' OR ')})`
      ).all(...keywords.map(k => `%${k}%`)) as MemoryEntry[];

      for (const row of rows) {
        let score = keywords.filter(k => row.content.toLowerCase().includes(k)).length / keywords.length;
        score = applyDecay(score, memType, row.last_accessed || row.created_at);
        this.prepare(`UPDATE ${table} SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?`).run(row.id);
        results.push({ ...row, score, type: memType });
      }
    }
    return results;
  }

  private vectorSearch(query: string, tables: string[], k: number): RetrievalResult[] {
    // Pure vector search — get query embedding, compare to all stored
    const results: RetrievalResult[] = [];
    for (const table of tables) {
      const memType = table.replace('_memory', '') as MemoryType;
      const rows = this.prepare(
        `SELECT * FROM ${table} WHERE active = 1 AND archived = 0 AND embedding IS NOT NULL ORDER BY last_accessed DESC`
      ).all() as MemoryEntry[];

      for (const row of rows) {
        // We'll score lazily if we had the query embedding — fallback to keyword for now
        let score = 0;
        const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        score = keywords.filter(k => row.content.toLowerCase().includes(k)).length / Math.max(keywords.length, 1);
        score = applyDecay(score, memType, row.last_accessed || row.created_at);
        this.prepare(`UPDATE ${table} SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?`).run(row.id);
        results.push({ ...row, score, type: memType });
      }
    }
    return results;
  }

  private hybridSearch(query: string, keywords: string[], tables: string[], k: number): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const kwResults = this.keywordSearch(keywords, tables, k * 2);

    for (const table of tables) {
      const memType = table.replace('_memory', '') as MemoryType;
      const rows = this.prepare(
        `SELECT * FROM ${table} WHERE active = 1 AND archived = 0 AND embedding IS NOT NULL`
      ).all() as MemoryEntry[];
      for (const row of rows) {
        results.push({ ...row, score: 0, type: memType });
      }
    }

    // Merge: keyword results get alpha=0.5 weight, vector results get 0.5
    const kwMap = new Map<string, number>();
    for (const r of kwResults) kwMap.set(r.id, r.score);

    for (const r of results) {
      const kwScore = kwMap.get(r.id) || 0;
      const recencyNorm = r.last_accessed
        ? 1 / (1 + (Date.now() - new Date(r.last_accessed).getTime()) / 86400000)
        : 0.3;
      const importanceNorm = (r as any).importance || 1.0;
      r.score = 0.3 * recencyNorm + 0.3 * importanceNorm + 0.4 * kwScore;
      r.score = applyDecay(r.score, r.type, r.last_accessed || r.created_at);
      const table = `${r.type}_memory`;
      this.prepare(`UPDATE ${table} SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?`).run(r.id);
    }

    return results;
  }

  // ─── Episodic Replay ───

  replay(topK: number = 5, minImportance: number = 0): { batch_id: string; episodes: RetrievalResult[]; theme: string }[] {
    const episodes = this.prepare(
      `SELECT e.*, (e.access_count * 0.6 + CASE WHEN e.lessons IS NOT NULL AND e.lessons != '' THEN 0.4 ELSE 0 END) as importance
       FROM episodic_memory e WHERE active = 1 AND archived = 0
       HAVING importance >= ?
       ORDER BY importance DESC, last_accessed DESC LIMIT ?`
    ).all(minImportance, topK * 2) as (MemoryEntry & { importance: number })[];

    if (episodes.length === 0) return [];

    // Simple clustering: group by similarity threshold (keyword overlap > 0.3)
    const groups: { theme: string; ids: string[]; episodes: RetrievalResult[] }[] = [];

    for (const ep of episodes) {
      const epKeywords = (ep.content || '').toLowerCase().split(/\s+/).filter(Boolean);
      let placed = false;

      for (const group of groups) {
        const sampleContent = group.episodes[0]?.content || '';
        const groupKeywords = sampleContent.toLowerCase().split(/\s+/).filter(Boolean);
        const overlap = groupKeywords.filter(k => epKeywords.includes(k)).length / Math.max(groupKeywords.length, 1);
        if (overlap > 0.3) {
          group.ids.push(ep.id);
          group.episodes.push({ ...ep, score: ep.importance, type: 'episodic' });
          placed = true;
          break;
        }
      }

      if (!placed) {
        const theme = epKeywords.slice(0, 3).join(' ') || 'general';
        groups.push({
          theme,
          ids: [ep.id],
          episodes: [{ ...ep, score: ep.importance, type: 'episodic' }],
        });
      }
    }

    const batchId = `replay_${Date.now()}`;
    for (const group of groups) {
      this.prepare(
        'INSERT INTO replay_log (batch_id, episode_ids, theme) VALUES (?, ?, ?)'
      ).run(batchId, JSON.stringify(group.ids), group.theme);
    }

    return groups.map(g => ({ batch_id: batchId, episodes: g.episodes.slice(0, topK), theme: g.theme }));
  }

  // ─── Associative Memory Recall (Ch3.3 Neural Memory alternative) ───

  associativeRecall(fragments: string[], k: number = 5): RetrievalResult[] {
    if (!fragments || fragments.length === 0) return [];

    // Step 1: Search each fragment independently
    const perFragmentResults: Map<string, { entry: RetrievalResult; fragmentIdx: number }[]> = new Map();

    for (let i = 0; i < fragments.length; i++) {
      const frag = fragments[i];
      const results = this.search(frag, 'all', k * 2, this._ollamaAvail ? 'hybrid' : 'keyword');
      for (const r of results) {
        const key = r.id;
        if (!perFragmentResults.has(key)) perFragmentResults.set(key, []);
        perFragmentResults.get(key)!.push({ entry: r, fragmentIdx: i });
      }
    }

    // Step 2: Fuse — boost scores by how many fragments matched
    const fused: RetrievalResult[] = [];
    for (const [id, matches] of perFragmentResults) {
      const bestEntry = matches.reduce((a, b) => a.entry.score > b.entry.score ? a : b).entry;
      const fragmentCoverage = matches.length / fragments.length; // 0..1
      const fragmentSet = new Set(matches.map(m => m.fragmentIdx));

      // Fusion formula: base score + coverage bonus (0.3 weight)
      const fusionScore = bestEntry.score + fragmentCoverage * 0.3;

      fused.push({
        ...bestEntry,
        score: Math.min(fusionScore, 1.0), // cap at 1.0
        _fusion: {
          fragment_count: matches.length,
          total_fragments: fragments.length,
          contributing_fragments: Array.from(fragmentSet).sort(),
          fragment_coverage: fragmentCoverage,
        } as any,
      });
    }

    // Step 3: Sort by fusion score, return top-k
    fused.sort((a, b) => b.score - a.score);
    return fused.slice(0, k);
  }

  /**
   * FuseSearch — semantic memory fusion.
   *
   * Runs search, then clusters results by Jaccard word-overlap similarity.
   * Clusters with similarity > 0.7 get fused into a single composite entry.
   *
   * Fused entries contain:
   * - content: concatenation of all source contents
   * - score: highest base score + 0.1 × (cluster_size - 1), capped at 1.0
   * - _fusion metadata: merged_count, source_ids
   */
  fuseSearch(query: string, type: string = 'all', k: number = 5, mode: string = 'keyword'): RetrievalResult[] {
    const results = this.search(query, type, k * 3, mode);

    const fused: RetrievalResult[] = [];
    const used = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      if (used.has(results[i].id)) continue;

      const cluster = [results[i]];
      used.add(results[i].id);

      for (let j = i + 1; j < results.length; j++) {
        if (used.has(results[j].id)) continue;
        const sim = this._computeSimilarity(results[i].content, results[j].content);
        if (sim > 0.7) {
          cluster.push(results[j]);
          used.add(results[j].id);
        }
      }

      if (cluster.length > 1) {
        const best = cluster.reduce((a, b) => a.score > b.score ? a : b);
        const fusedContent = cluster.map(r => r.content).join('\n---\n');
        fused.push({
          ...best,
          content: fusedContent,
          score: Math.min(best.score + 0.1 * (cluster.length - 1), 1.0),
          _fusion: {
            merged_count: cluster.length,
            source_ids: cluster.map(r => r.id),
          } as any,
        });
      } else {
        fused.push(results[i]);
      }
    }

    fused.sort((a, b) => b.score - a.score);
    return fused.slice(0, k);
  }

  // ─── Mood Tracking (Wave 10) ───

  moodSet(sessionId: string, mode: string, confidence: number): void {
    const decay = mode === 'URGENT' ? 0.5 : 0.25; // halflife 30min vs 2hr
    this.prepare(
      `INSERT INTO mood_state (session_id, mode, confidence, timestamp, decay_rate)
       VALUES (?, ?, ?, datetime('now'), ?)
       ON CONFLICT(session_id, mode) DO UPDATE SET
         confidence = ?, timestamp = datetime('now'), decay_rate = ?`
    ).run(sessionId, mode, confidence, decay, confidence, decay);
  }

  moodGet(sessionId: string): { mode: string; confidence: number; decay_rate: number } | null {
    const row = this.prepare(
      `SELECT mode, confidence, timestamp, decay_rate FROM mood_state
       WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1`
    ).get(sessionId) as any;
    if (!row) return null;

    // Apply exponential decay
    const elapsedMin = (Date.now() - new Date(row.timestamp + 'Z').getTime()) / 60000;
    const halflifeMin = row.decay_rate === 0.5 ? 30 : 120; // 0.5 = 30min, 0.25 = 2hr
    const decayed = row.confidence * Math.pow(0.5, elapsedMin / halflifeMin);

    return { mode: row.mode, confidence: Math.max(0, decayed), decay_rate: row.decay_rate };
  }

  // ─── Existing API ───

  getRelations(key: string): Array<{from:string; to:string; relation:string; strength:number}> {
    return this.prepare(
      'SELECT * FROM memory_relations WHERE from_key = ? OR to_key = ?'
    ).all(key, key) as any;
  }

  createRelation(from: string, to: string, relation: RelationType, strength: number = 1.0): {ok: boolean; reason?: string; id?: number} {
    if (this.detectCycle(to, from)) {
      return { ok: false, reason: `circular reference detected: ${from} -> ${to} would create cycle` };
    }
    const existing = this.prepare(
      'SELECT id FROM memory_relations WHERE from_key = ? AND to_key = ? AND relation_type = ?'
    ).get(from, to, relation) as any;
    if (existing) {
      this.prepare('UPDATE memory_relations SET strength = ? WHERE id = ?').run(strength, existing.id);
      return { ok: true, id: existing.id };
    }
    const result = this.prepare(
      'INSERT INTO memory_relations (from_key, to_key, relation_type, strength) VALUES (?, ?, ?, ?)'
    ).run(from, to, relation, strength);
    return { ok: true, id: Number(result.lastInsertRowid) };
  }

  private detectCycle(from: string, to: string): boolean {
    const visited = new Set<string>();
    const queue = [to];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === from) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const edges = this.prepare('SELECT to_key FROM memory_relations WHERE from_key = ?').all(current) as any[];
      for (const edge of edges) queue.push(edge.to_key);
    }
    return false;
  }

  delete(key: string): void {
    this.prepare("UPDATE episodic_memory SET active = 0, last_accessed = datetime('now') WHERE id = ?").run(key);
    this.prepare("UPDATE semantic_memory SET access_count = -1 WHERE id = ?").run(key);
    this.prepare("UPDATE procedural_memory SET deprecated = 1 WHERE id = ?").run(key);
  }

  stats(): {counts: Record<string,number>; decay_stats: {decayed_today:number; total_active:number}} {
    const tables = ['episodic_memory','semantic_memory','procedural_memory','working_memory'];
    const counts: Record<string,number> = {};
    for (const t of tables) {
      counts[t.replace('_memory','')] = (this.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE active = 1`).get() as any).c;
    }
    counts['relations'] = (this.prepare('SELECT COUNT(*) as c FROM memory_relations').get() as any).c;
    const totalActive = Object.values(counts).reduce((a,b) => a+b, 0) - counts['relations'];
    const decayed = (this.prepare("SELECT COUNT(*) as c FROM episodic_memory WHERE active = 0 AND DATE(created_at) < DATE('now','-30 days')").get() as any).c;
    return { counts, decay_stats: { decayed_today: decayed, total_active: totalActive } };
  }

  // ─── Hash-based Embedding Storage & Semantic Search ───

  storeEmbedding(id: string, memoryId: string | null, buf: Buffer): void {
    this.prepare(
      'INSERT INTO embeddings (id, memory_id, vector) VALUES (?, ?, ?)'
    ).run(id, memoryId, buf);
  }

  semanticSearch(queryVec: number[], topK: number): RetrievalResult[] {
    const rows = this.prepare(
      'SELECT id, memory_id, vector FROM embeddings WHERE memory_id IS NOT NULL'
    ).all() as Array<{ id: string; memory_id: string; vector: Buffer }>;

    const scored: RetrievalResult[] = [];
    const memTypes: MemoryType[] = ['episodic', 'semantic', 'procedural', 'working'];

    for (const row of rows) {
      const stored = new Float32Array(row.vector.buffer, row.vector.byteOffset, row.vector.byteLength / 4);
      const storedNum: number[] = Array.from(stored);
      const sim = cosineSimilarity(queryVec, storedNum);

      // Resolve memory_id against all memory tables
      for (const memType of memTypes) {
        const mem = this.prepare(
          `SELECT id, content, access_count, last_accessed, created_at FROM ${memType}_memory WHERE id = ?`
        ).get(row.memory_id) as any;

        if (mem) {
          scored.push({
            id: mem.id,
            content: mem.content || '',
            type: memType,
            tags: [],
            access_count: mem.access_count || 0,
            last_accessed: mem.last_accessed || mem.created_at,
            active: 1,
            created_at: mem.created_at || '',
            score: sim,
            _importance: Math.min(1.0, (mem.access_count || 0) / 10), // derived from access count
          } as RetrievalResult & { _importance: number });
          break;
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // ─── Memory Decay & Consolidation ───

  /**
   * Decay memories not accessed for > daysThreshold days.
   * - Reduces their importance by 50%
   * - If importance < 0.1 AND not accessed for > daysThreshold * 2 → archvied
   */
  decayMemories(daysThreshold: number = 30): { decayed: number; archived: number } {
    const tables = ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory'];
    let totalDecayed = 0;
    let totalArchived = 0;

    for (const table of tables) {
      // Step 1: Reduce importance by 50% for stale memories
      const decayResult = this.prepare(
        `UPDATE ${table}
         SET importance = MAX(0.0, COALESCE(importance, 1.0) * 0.5)
         WHERE archived = 0
           AND last_accessed IS NOT NULL
           AND last_accessed < datetime('now', ?)`
      ).run(`-${daysThreshold} days`);
      totalDecayed += decayResult.changes;

      // Step 2: Archive severely decayed + very stale memories
      const archiveResult = this.prepare(
        `UPDATE ${table}
         SET archived = 1
         WHERE archived = 0
           AND COALESCE(importance, 1.0) < 0.1
           AND last_accessed IS NOT NULL
           AND last_accessed < datetime('now', ?)`
      ).run(`-${daysThreshold * 2} days`);
      totalArchived += archiveResult.changes;
    }

    return { decayed: totalDecayed, archived: totalArchived };
  }

  /**
   * Consolidate memories:
   * - Merge >3 related low-importance memories (same topic) into one summary
   * - Strengthen frequently accessed memories (access_count > 10)
   */
  consolidateMemories(): { merged: number; deleted: number; strengthened: number } {
    let merged = 0;
    let deleted = 0;
    let strengthened = 0;

    // Only episodic & semantic have free-form content suitable for keyword clustering
    const mergeTables = ['episodic_memory', 'semantic_memory'];

    for (const table of mergeTables) {
      const memType = table.replace('_memory', '') as MemoryType;

      // Fetch low-importance memories (still active, not archived)
      const lowImpRows = this.prepare(
        `SELECT id, content, tags, COALESCE(importance, 1.0) as importance
         FROM ${table}
         WHERE archived = 0 AND active = 1 AND COALESCE(importance, 1.0) < 0.5
         ORDER BY last_accessed ASC`
      ).all() as any[];

      // Group by keyword overlap (Jaccard > 0.3)
      const groups: { ids: string[]; contents: string[] }[] = [];
      const used = new Set<string>();

      for (const row of lowImpRows) {
        if (used.has(row.id)) continue;
        const group = { ids: [row.id], contents: [row.content] };
        used.add(row.id);

        for (const other of lowImpRows) {
          if (used.has(other.id)) continue;
          const sim = this._computeSimilarity(row.content, other.content);
          if (sim > 0.3) {
            group.ids.push(other.id);
            group.contents.push(other.content);
            used.add(other.id);
          }
        }

        if (group.ids.length > 3) {
          groups.push(group);
        }
      }

      // Merge each group into one summary, delete originals
      for (const group of groups) {
        const mergedContent = group.contents.join('\n---\n');
        const mergedId = `merged_${memType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (table === 'episodic_memory') {
          this.prepare(
            `INSERT INTO episodic_memory (id, content, session_id, tags, importance, last_accessed, access_count)
             VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`
          ).run(mergedId, mergedContent, 'consolidation', JSON.stringify(['merged', memType]), 0.5);
        } else {
          this.prepare(
            `INSERT INTO semantic_memory (id, name, entity_type, description, tags, importance, last_accessed, access_count)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)`
          ).run(mergedId, `merged:${memType}`, 'consolidated', mergedContent, JSON.stringify(['merged', memType]), 0.5);
        }

        // Soft-delete originals via archived flag
        for (const id of group.ids) {
          this.prepare(`UPDATE ${table} SET archived = 1 WHERE id = ?`).run(id);
          deleted++;
        }
        merged++;
      }
    }

    // Strengthen frequently accessed memories across ALL tables that have access_count
    const strengthenTables = ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory'];
    for (const table of strengthenTables) {
      const result = this.prepare(
        `UPDATE ${table}
         SET importance = MIN(1.0, COALESCE(importance, 1.0) * 1.5)
         WHERE archived = 0 AND COALESCE(access_count, 0) > 10`
      ).run();
      strengthened += result.changes;
    }

    return { merged, deleted, strengthened };
  }

  // ─── Memory Conflict Detection & Resolution ───

  private _getAllActiveMemories(): Array<{
    id: string; type: string; content: string; tags: string[];
    importance: number; last_accessed: string; created_at: string;
  }> {
    const tables = ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory'];
    const results: Array<{
      id: string; type: string; content: string; tags: string[];
      importance: number; last_accessed: string; created_at: string;
    }> = [];

    for (const table of tables) {
      const memType = table.replace('_memory', '') as MemoryType;
      const rows = this.prepare(
        `SELECT id, content, tags, COALESCE(importance, 1.0) as importance,
                last_accessed, created_at
         FROM ${table}
         WHERE active = 1 AND archived = 0
         ORDER BY last_accessed DESC`
      ).all() as any[];

      for (const row of rows) {
        let tags: string[] = [];
        try { tags = JSON.parse(row.tags || '[]'); } catch { /* ignore parse errors */ }
        results.push({
          id: row.id,
          type: memType,
          content: row.content || '',
          tags,
          importance: Number(row.importance) || 1.0,
          last_accessed: row.last_accessed || row.created_at || '',
          created_at: row.created_at || '',
        });
      }
    }

    return results;
  }

  detectConflicts(topic?: string): {
    conflicts: Array<{
      topic: string;
      conflicting_memories: Array<{ id: string; summary: string; importance: number; timestamp: string }>;
      resolution: { method: 'importance_weighted' | 'recency' | 'flagged'; winner_id: string; reason: string };
    }>;
    resolved: number;
    flagged: number;
  } {
    const allMemories = this._getAllActiveMemories();

    // Filter by topic if specified (match in tags or content)
    let filtered = allMemories;
    if (topic) {
      const topicLower = topic.toLowerCase();
      filtered = allMemories.filter(m =>
        m.tags.some(t => t.toLowerCase().includes(topicLower)) ||
        m.content.toLowerCase().includes(topicLower)
      );
    }

    // Tag index: tag -> memory ids
    const tagIndex = new Map<string, string[]>();
    for (const mem of filtered) {
      for (const tag of mem.tags) {
        const t = tag.toLowerCase().trim();
        if (!t) continue;
        if (!tagIndex.has(t)) tagIndex.set(t, []);
        tagIndex.get(t)!.push(mem.id);
      }
    }

    // Memory map for quick lookup
    const memMap = new Map<string, typeof filtered[0]>();
    for (const mem of filtered) memMap.set(mem.id, mem);

    // Detect conflicting pairs: share a tag AND have moderately similar content
    const conflictPairs = new Map<string, { id1: string; id2: string; topic: string }>();
    const processedPairs = new Set<string>();

    for (const [tag, members] of tagIndex) {
      if (members.length < 2) continue;
      const uniqueMembers = [...new Set(members)];

      for (let i = 0; i < uniqueMembers.length; i++) {
        for (let j = i + 1; j < uniqueMembers.length; j++) {
          const a = memMap.get(uniqueMembers[i]);
          const b = memMap.get(uniqueMembers[j]);
          if (!a || !b) continue;

          const pairKey = [a.id, b.id].sort().join('::');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const sim = this._computeSimilarity(a.content, b.content);

          // Conflict zone: moderately similar but not close enough to merge
          if (sim >= 0.3 && sim < MemoryStore.SIMILARITY_MERGE_THRESHOLD) {
            conflictPairs.set(pairKey, { id1: a.id, id2: b.id, topic: tag });
          }
        }
      }
    }

    // Build results with resolutions
    const conflicts: Array<{
      topic: string;
      conflicting_memories: Array<{ id: string; summary: string; importance: number; timestamp: string }>;
      resolution: { method: 'importance_weighted' | 'recency' | 'flagged'; winner_id: string; reason: string };
    }> = [];

    let flagged = 0;

    for (const [, pair] of conflictPairs) {
      const a = memMap.get(pair.id1)!;
      const b = memMap.get(pair.id2)!;

      const tsA = a.last_accessed || a.created_at;
      const tsB = b.last_accessed || b.created_at;

      let method: 'importance_weighted' | 'recency' | 'flagged' = 'importance_weighted';
      let winner_id = a.id;
      let reason: string;

      if (a.importance > b.importance) {
        winner_id = a.id;
        method = 'importance_weighted';
        reason = `Higher importance (${a.importance.toFixed(2)} vs ${b.importance.toFixed(2)})`;
      } else if (b.importance > a.importance) {
        winner_id = b.id;
        method = 'importance_weighted';
        reason = `Higher importance (${b.importance.toFixed(2)} vs ${a.importance.toFixed(2)})`;
      } else if (tsA > tsB) {
        winner_id = a.id;
        method = 'recency';
        reason = `More recent (${tsA} vs ${tsB})`;
      } else if (tsB > tsA) {
        winner_id = b.id;
        method = 'recency';
        reason = `More recent (${tsB} vs ${tsA})`;
      } else {
        method = 'flagged';
        reason = 'Tied on importance and recency — needs human review';
        flagged++;
      }

      conflicts.push({
        topic: pair.topic,
        conflicting_memories: [
          { id: a.id, summary: a.content.slice(0, 200), importance: a.importance, timestamp: tsA },
          { id: b.id, summary: b.content.slice(0, 200), importance: b.importance, timestamp: tsB },
        ],
        resolution: { method, winner_id, reason },
      });
    }

    return { conflicts, resolved: conflicts.length - flagged, flagged };
  }

  resolveConflict(keepId: string, deleteIds: string[]): { resolved: boolean; kept: string; deleted: number } {
    const tables = ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory'];

    // Soft-delete the losing memories
    for (const id of deleteIds) {
      this.delete(id);
    }

    // Strengthen the kept memory
    let kept = false;
    for (const table of tables) {
      const row = this.prepare(
        `SELECT id, COALESCE(importance, 1.0) as importance, content FROM ${table} WHERE id = ?`
      ).get(keepId) as any;

      if (row) {
        const oldImp = Number(row.importance) || 1.0;
        const newImportance = Math.min(1.0, oldImp + 0.2);
        this.prepare(
          `UPDATE ${table} SET importance = ?, last_accessed = datetime('now') WHERE id = ?`
        ).run(newImportance, keepId);

        const memType = table.replace('_memory', '');
        this._logHistory(
          keepId, memType,
          row.content || '',
          row.content || '',
          `conflict_resolution: kept over [${deleteIds.join(', ')}] (importance ${oldImp.toFixed(2)} → ${newImportance.toFixed(2)})`
        );
        kept = true;
        break;
      }
    }

    return { resolved: kept, kept: keepId, deleted: deleteIds.length };
  }

  close(): void { this.db.close(); }
  query(sql: string, params: any[] = []): any[] { return this.prepare(sql).all(...params) as any[]; }

  getHistory(memoryId: string): Array<{oldContent: string; newContent: string; changeReason: string; createdAt: string}> {
    return this.prepare(
      'SELECT old_content, new_content, change_reason, created_at FROM memory_history WHERE memory_id = ? ORDER BY created_at DESC'
    ).all(memoryId) as any;
  }
}
