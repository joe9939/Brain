// Persistence v2 — SQLite-based memory storage
// Aligned with arXiv 2504.01990v2 §2.2 (Memory) + §2.4 (Reward) + §3 (Self-optimization)
// Borrows from: FadeMem decay, μ-gate (MemCtrl), TencentDB layered design

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';

export interface EpisodicRow {
  id: string; content: string; importance: number;
  tags: string; created_at: string; last_accessed: string; access_count: number;
}

export interface SemanticRow {
  id: string; concept: string; facts: string; confidence: number;
  created_at: string; last_accessed: string; access_count: number;
}

export interface ProceduralRow {
  id: string; trigger: string; steps: string; context: string;
  frequency: number; created_at: string; last_accessed: string;
}

export interface PreferenceRow {
  key: string; value: number; updated_at: string;
}

// Decay constants from FadeMem (§2.2.5)
const DECAY_LAMBDAS = { episodic: 0.05, procedural: 0.15, semantic: 0.02, working: 0.3 };
const FORGET_THRESHOLD = 0.01; // below this → eligible for pruning

export class Persistence {
  private db: Database.Database;
  private path: string;

  constructor(dbPath?: string) {
    this.path = dbPath || join(process.cwd(), 'brain-data.db');
    const dir = join(this.path, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    this.db = new Database(this.path);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id TEXT PRIMARY KEY, content TEXT NOT NULL,
        importance REAL DEFAULT 0.5, tags TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        last_accessed TEXT DEFAULT (datetime('now')),
        access_count INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id TEXT PRIMARY KEY, concept TEXT UNIQUE NOT NULL,
        facts TEXT DEFAULT '', confidence REAL DEFAULT 0.5,
        created_at TEXT DEFAULT (datetime('now')),
        last_accessed TEXT DEFAULT (datetime('now')),
        access_count INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS procedural_memory (
        id TEXT PRIMARY KEY, trigger TEXT NOT NULL,
        steps TEXT NOT NULL, context TEXT DEFAULT '',
        frequency INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        last_accessed TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY, value REAL NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS signal_weights (
        signal TEXT PRIMARY KEY, priority INTEGER NOT NULL,
        params TEXT DEFAULT '{}', updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  // ─── Episodic Memory (§2.2.3) ───
  saveEpisodic(id: string, content: string, importance = 0.5, tags: string[] = []): void {
    this.db.prepare(`
      INSERT INTO episodic_memory (id, content, importance, tags)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        importance = MAX(importance, excluded.importance),
        tags = excluded.tags,
        last_accessed = datetime('now'),
        access_count = access_count + 1
    `).run(id, content, importance, tags.join(','));
  }

  retrieveEpisodic(query: string, k = 5): EpisodicRow[] {
    const q = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT *, julianday('now') - julianday(created_at) as age_days
      FROM episodic_memory
      WHERE content LIKE ? OR tags LIKE ?
      ORDER BY importance * power(0.95, julianday('now') - julianday(created_at)) DESC
      LIMIT ?
    `).all(q, q, k) as any[];
    
    // Update access count
    rows.forEach((r: any) => {
      this.db.prepare(`UPDATE episodic_memory SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?`).run(r.id);
    });
    return rows;
  }

  // ─── Semantic Memory (§2.2.3) ───
  saveSemantic(concept: string, facts: string, confidence = 0.5): void {
    this.db.prepare(`
      INSERT INTO semantic_memory (id, concept, facts, confidence)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(concept) DO UPDATE SET
        facts = excluded.facts,
        confidence = MIN(1.0, confidence + 0.1),
        last_accessed = datetime('now')
    `).run(`sem-${Date.now()}`, concept, facts, confidence);
  }

  retrieveSemantic(concept: string): SemanticRow | null {
    const row = this.db.prepare(`
      UPDATE semantic_memory SET access_count = access_count + 1, last_accessed = datetime('now')
      WHERE concept = ? RETURNING *
    `).get(concept) as any;
    return row || null;
  }

  // ─── Procedural/SOP Memory (§2.2.3) ───
  saveSOP(id: string, trigger: string, steps: string[], context = ''): void {
    const existing = this.db.prepare(`SELECT id FROM procedural_memory WHERE id = ?`).get(id) as any;
    if (existing) {
      this.db.prepare(`UPDATE procedural_memory SET frequency = frequency + 1, last_accessed = datetime('now') WHERE id = ?`).run(id);
    } else {
      this.db.prepare(`INSERT INTO procedural_memory (id, trigger, steps, context) VALUES (?, ?, ?, ?)`).run(id, trigger, JSON.stringify(steps), context);
    }
  }

  matchSOP(input: string): ProceduralRow | null {
    const rows = this.db.prepare(`SELECT * FROM procedural_memory ORDER BY frequency DESC`).all() as any[];
    for (const row of rows) {
      try {
        const trigger = new RegExp(row.trigger, 'i');
        if (trigger.test(input)) {
          this.db.prepare(`UPDATE procedural_memory SET frequency = frequency + 1, last_accessed = datetime('now') WHERE id = ?`).run(row.id);
          return row;
        }
      } catch {}
    }
    return null;
  }

  // ─── Preferences (§2.4 — reward shapes behavior) ───
  recordPreference(key: string, value: number): void {
    const existing = this.db.prepare(`SELECT value FROM preferences WHERE key = ?`).get(key) as any;
    const newVal = existing ? existing.value * 0.7 + value * 0.3 : value;
    this.db.prepare(`
      INSERT INTO preferences (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, newVal);
  }

  getPreferences(): Record<string, number> {
    const rows = this.db.prepare(`SELECT key, value FROM preferences`).all() as PreferenceRow[];
    const prefs: Record<string, number> = {};
    rows.forEach(r => { prefs[r.key] = r.value; });
    return prefs;
  }

  // ─── Signal Weights (§3 — self-optimization) ───
  saveSignalWeights(signal: string, priority: number, params: Record<string, any> = {}): void {
    this.db.prepare(`
      INSERT INTO signal_weights (signal, priority, params) VALUES (?, ?, ?)
      ON CONFLICT(signal) DO UPDATE SET priority = excluded.priority, params = excluded.params, updated_at = datetime('now')
    `).run(signal, priority, JSON.stringify(params));
  }

  getSignalWeights(): Record<string, any> {
    const rows = this.db.prepare(`SELECT signal, priority, params FROM signal_weights`).all() as any[];
    const w: Record<string, any> = {};
    rows.forEach(r => { w[r.signal] = { priority: r.priority, ...JSON.parse(r.params || '{}') }; });
    return w;
  }

  // ─── μ-gate: RETAIN/UPDATE/DISCARD (MemCtrl) ───
  // Simplified: importance × frequency × recency → decision
  muGate(id: string, type: string): 'RETAIN' | 'UPDATE' | 'DISCARD' {
    const table = `${type}_memory`;
    try {
      const row = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as any;
      if (!row) return 'RETAIN';
      
      const ageDays = (Date.now() - new Date(row.last_accessed || row.created_at).getTime()) / 86400000;
      const decay = DECAY_LAMBDAS[type] || 0.05;
      const importance = row.importance || 0.5;
      const accessCount = row.access_count || 1;
      const score = importance * Math.exp(-decay * ageDays) * Math.log2(accessCount + 2);
      
      if (score < FORGET_THRESHOLD) return 'DISCARD';
      if (ageDays < 1) return 'RETAIN';
      if (importance < 0.3 && ageDays > 7) return 'DISCARD';
      return 'RETAIN';
    } catch { return 'RETAIN'; }
  }

  // ─── Prune forgotten memories ───
  pruneForgotten(): { discarded: number } {
    let total = 0;
    ['episodic', 'semantic', 'procedural'].forEach(type => {
      const table = `${type}_memory`;
      try {
        const rows = this.db.prepare(`SELECT id FROM ${table}`).all() as any[];
        rows.forEach((r: any) => {
          try {
            const gate = this.muGate(r.id, type);
            if (gate === 'DISCARD') {
              this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(r.id);
              total++;
            }
          } catch {}
        });
      } catch {}
    });
    return { discarded: total };
  }

  // ─── Stats ───
  stats() {
    const count = (t: string) => (this.db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as any).c;
    return {
      episodic: count('episodic_memory'),
      semantic: count('semantic_memory'),
      procedural: count('procedural_memory'),
      preferences: count('preferences'),
      signals: count('signal_weights'),
    };
  }

  close(): void { this.db.close(); }
}
