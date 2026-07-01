// @ts-nocheck
import { Database, initDatabase } from './compat.js';
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

      CREATE TABLE IF NOT EXISTS agent_scores (
        agent_name TEXT PRIMARY KEY,
        reliability REAL DEFAULT 0.5,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        avg_response_time_ms INTEGER DEFAULT 0,
        total_tasks INTEGER DEFAULT 0,
        last_seen TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_reliability ON agent_scores(reliability DESC);
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

  scoreAgent(agentName: string, outcome: 'success' | 'failure', responseTimeMs?: number): { agent: string; reliability: number; total_tasks: number } {
    const now = new Date().toISOString();
    const existing = this.prep('SELECT * FROM agent_scores WHERE agent_name = ?').get(agentName) as any;

    const successCount = existing ? existing.success_count + (outcome === 'success' ? 1 : 0) : (outcome === 'success' ? 1 : 0);
    const failureCount = existing ? existing.failure_count + (outcome === 'failure' ? 1 : 0) : (outcome === 'failure' ? 1 : 0);
    const totalTasks = successCount + failureCount;
    const reliability = totalTasks > 0 ? Math.round((successCount / totalTasks) * 10000) / 10000 : 0.5;

    let avgRespMs: number;
    if (existing && existing.total_tasks > 0 && responseTimeMs !== undefined) {
      // Weighted moving average: new = existing * (n/(n+1)) + newVal * (1/(n+1))
      avgRespMs = Math.round((existing.avg_response_time_ms * existing.total_tasks + responseTimeMs) / (existing.total_tasks + 1));
    } else if (responseTimeMs !== undefined) {
      avgRespMs = responseTimeMs;
    } else {
      avgRespMs = existing ? existing.avg_response_time_ms : 0;
    }

    this.prep(
      `INSERT INTO agent_scores (agent_name, reliability, success_count, failure_count, avg_response_time_ms, total_tasks, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(agent_name) DO UPDATE SET
         reliability = excluded.reliability,
         success_count = excluded.success_count,
         failure_count = excluded.failure_count,
         avg_response_time_ms = excluded.avg_response_time_ms,
         total_tasks = excluded.total_tasks,
         last_seen = excluded.last_seen`
    ).run(agentName, reliability, successCount, failureCount, avgRespMs, totalTasks, now);

    return { agent: agentName, reliability, total_tasks: totalTasks };
  }

  getAgentReputation(agentName?: string): Array<{
    agent_name: string; reliability: number; success_count: number; failure_count: number; total_tasks: number;
  }> {
    if (agentName) {
      const row = this.prep('SELECT * FROM agent_scores WHERE agent_name = ?').get(agentName) as any;
      if (!row) return [];
      return [{
        agent_name: row.agent_name, reliability: row.reliability,
        success_count: row.success_count, failure_count: row.failure_count,
        total_tasks: row.total_tasks,
      }];
    }
    return this.prep(
      'SELECT agent_name, reliability, success_count, failure_count, total_tasks FROM agent_scores ORDER BY reliability DESC'
    ).all() as any[];
  }

  close(): void { this.db.close(); }
}
