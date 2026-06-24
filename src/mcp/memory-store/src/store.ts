import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MemoryType, RelationType, MemoryEntry, RetrievalResult } from './types.js';
import { applyDecay } from './decay.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'memory', 'memory.db');

export class MemoryStore {
  private db: Database.Database;
  private stmts: Map<string, Database.Statement> = new Map();

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

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
  }

  search(query: string, type: string = 'all', k: number = 5, mode: string = 'keyword'): RetrievalResult[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (keywords.length === 0) return [];

    const tables = type === 'all'
      ? ['episodic_memory', 'semantic_memory', 'procedural_memory', 'working_memory']
      : [`${type}_memory`];

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

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

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
    this.prepare(
      "UPDATE episodic_memory SET active = 0, last_accessed = datetime('now') WHERE id = ?"
    ).run(key);
    this.prepare(
      "UPDATE semantic_memory SET access_count = -1 WHERE id = ?"
    ).run(key);
    this.prepare(
      "UPDATE procedural_memory SET deprecated = 1 WHERE id = ?"
    ).run(key);
  }

  stats(): {counts: Record<string,number>; decay_stats: {decayed_today:number; total_active:number}} {
    const tables = ['episodic_memory','semantic_memory','procedural_memory','working_memory'];
    const counts: Record<string,number> = {};
    for (const t of tables) {
      counts[t.replace('_memory','')] = (this.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE active = 1`).get() as any).c;
    }
    counts['relations'] = (this.prepare('SELECT COUNT(*) as c FROM memory_relations').get() as any).c;

    const totalActive = Object.values(counts).reduce((a,b) => a+b, 0) - counts['relations'];
    const decayed = (this.prepare(
      "SELECT COUNT(*) as c FROM episodic_memory WHERE active = 0 AND DATE(created_at) < DATE('now','-30 days')"
    ).get() as any).c;

    return { counts, decay_stats: { decayed_today: decayed, total_active: totalActive } };
  }

  
  
  close(): void { this.db.
  
  close(); }
  query(sql: string, params: any[] = []): any[] { return this.prepare(sql).all(...params) as any[]; }
}