import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'tool-tracker', 'tools.db');

export interface ToolRecord {
  id: number;
  tool_name: string;
  action_type: string;
  target: string;
  success: number;
  duration_ms: number;
  context_hash: string;
  created_at: string;
}

export class ToolTracker {
  private db: Database.Database;
  private stmts: Map<string, Database.Statement> = new Map();

  constructor(dbPath: string = DB_PATH) {
    const dir = dirname(dbPath);
    Database('').close(); // ensure better-sqlite3 is available
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target TEXT DEFAULT '',
        success INTEGER NOT NULL DEFAULT 1,
        duration_ms INTEGER DEFAULT 0,
        context_hash TEXT DEFAULT '',
        task_description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tool_name ON tool_usage(tool_name);
      CREATE INDEX IF NOT EXISTS idx_created ON tool_usage(created_at);
    `);
  }

  private prep(sql: string): Database.Statement {
    if (!this.stmts.has(sql)) this.stmts.set(sql, this.db.prepare(sql));
    return this.stmts.get(sql)!;
  }

  track(actionType: string, target: string, success: boolean, durationMs: number, context: string, taskDesc: string = ''): void {
    this.prep(
      `INSERT INTO tool_usage (tool_name, action_type, target, success, duration_ms, context_hash, task_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(actionType.split('_')[0] || actionType, actionType, target, success ? 1 : 0, durationMs, context.slice(0, 32), taskDesc.slice(0, 200));
  }

  getStats(toolName?: string, k: number = 10): Array<{
    tool_name: string; action_type: string; count: number; success_rate: number; avg_duration_ms: number;
  }> {
    const where = toolName ? 'WHERE tool_name = ?' : '';
    return this.prep(
      `SELECT tool_name, action_type, COUNT(*) as count,
              ROUND(AVG(CAST(success AS FLOAT)), 2) as success_rate,
              ROUND(AVG(duration_ms)) as avg_duration_ms
       FROM tool_usage ${where}
       GROUP BY tool_name, action_type
       ORDER BY count DESC LIMIT ?`
    ).all(...(toolName ? [toolName, k] : [k])) as any[];
  }

  recommend(taskDescription: string, k: number = 3): Array<{
    tool_name: string; score: number; success_rate: number; count: number;
  }> {
    const keywords = taskDescription.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];

    const rows = this.prep(
      `SELECT tool_name, action_type,
              COUNT(*) as count,
              ROUND(AVG(CAST(success AS FLOAT)), 2) as success_rate,
              GROUP_CONCAT(task_description) as tasks
       FROM tool_usage GROUP BY tool_name, action_type
       HAVING count >= 1
       ORDER BY count DESC`
    ).all() as any[];

    const scored = rows.map((r: any) => {
      const taskText = (r.tasks || '').toLowerCase();
      const matchCount = keywords.filter(k => taskText.includes(k)).length;
      const keywordScore = keywords.length > 0 ? matchCount / keywords.length : 0;
      const score = keywordScore * 0.5 + (r.success_rate || 0) * 0.3 + Math.min(r.count / 10, 1) * 0.2;
      return { tool_name: r.tool_name, score: Math.round(score * 100) / 100, success_rate: r.success_rate, count: r.count };
    });

    return scored.sort((a: any, b: any) => b.score - a.score).slice(0, k);
  }

  getTimeline(from?: string, to?: string, k: number = 50): ToolRecord[] {
    let sql = 'SELECT * FROM tool_usage WHERE 1=1';
    const params: any[] = [];
    if (from) { sql += ' AND created_at >= ?'; params.push(from); }
    if (to) { sql += ' AND created_at <= ?'; params.push(to); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(k);
    return this.prep(sql).all(...params) as ToolRecord[];
  }

  close(): void { this.db.close(); }
}
