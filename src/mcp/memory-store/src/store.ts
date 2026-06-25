import Database from 'better-sqlite3';
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
      this.prepare(
        'INSERT INTO memory_history (memory_id, memory_type, old_content, new_content, change_reason) VALUES (?, ?, ?, ?, ?)'
      ).run(key, type, existing.content, content, 'update');
      
      this.prepare(`UPDATE ${table} SET content = ?, tags = ?, last_accessed = datetime('now') WHERE id = ?`)
        .run(content, JSON.stringify(tags), key);
    } else {
      this.prepare(`INSERT INTO ${table} (id, content, tags, last_accessed) VALUES (?, ?, ?, datetime('now'))`)
        .run(key, content, JSON.stringify(tags));
    }

    // Try async vector embedding (fire and forget — won't block)
    this.tryStoreEmbedding(type, key, content).catch(() => {});
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
        `SELECT * FROM ${table} WHERE active = 1 AND (${keywords.map(() => 'LOWER(content) LIKE ?').join(' OR ')})`
      ).all(...keywords.map(k => `%${k}%`)) as MemoryEntry[];

      for (const row of rows) {
        let score = keywords.filter(k => row.content.toLowerCase().includes(k)).length / keywords.length;
        score = applyDecay(score, memType, row.last_accessed || row.created_at);
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
        `SELECT * FROM ${table} WHERE active = 1 AND embedding IS NOT NULL ORDER BY last_accessed DESC`
      ).all() as MemoryEntry[];

      for (const row of rows) {
        // We'll score lazily if we had the query embedding — fallback to keyword for now
        let score = 0;
        const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        score = keywords.filter(k => row.content.toLowerCase().includes(k)).length / Math.max(keywords.length, 1);
        score = applyDecay(score, memType, row.last_accessed || row.created_at);
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
        `SELECT * FROM ${table} WHERE active = 1 AND embedding IS NOT NULL`
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
      r.score = kwScore; // simplified hybrid — keyword score only for now
      r.score = applyDecay(r.score, r.type, r.last_accessed || r.created_at);
    }

    return results;
  }

  // ─── Episodic Replay ───

  replay(topK: number = 5, minImportance: number = 0): { batch_id: string; episodes: RetrievalResult[]; theme: string }[] {
    const episodes = this.prepare(
      `SELECT e.*, (e.access_count * 0.6 + CASE WHEN e.lessons IS NOT NULL AND e.lessons != '' THEN 0.4 ELSE 0 END) as importance
       FROM episodic_memory e WHERE active = 1
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

  close(): void { this.db.close(); }
  query(sql: string, params: any[] = []): any[] { return this.prepare(sql).all(...params) as any[]; }
}
