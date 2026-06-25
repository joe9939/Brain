import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TaskItem {
  id: string;
  description: string;
  urgency: number;
  effort_estimate: number;
  dependencies: string;
  context: string;
  status: "pending" | "active" | "completed" | "blocked";
  priority_score: number;
  created_at: string;
  completed_at: string | null;
}

export class PriorityQueue {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, "..", "priority-queue.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        urgency REAL DEFAULT 0.5,
        effort_estimate REAL DEFAULT 1.0,
        dependencies TEXT DEFAULT '[]',
        context TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        priority_score REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority_score DESC);
    `);
  }

  add(
    id: string,
    description: string,
    urgency: number = 0.5,
    effortEstimate: number = 1.0,
    dependencies: string[] = [],
    context: string = ""
  ): TaskItem {
    const taskId = id || randomUUID();
    this.db.prepare(`
      INSERT INTO tasks (id, description, urgency, effort_estimate, dependencies, context, status, priority_score)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0.0)
    `).run(taskId, description, urgency, effortEstimate, JSON.stringify(dependencies), context);
    return this.get(taskId)!;
  }

  prioritize(): { reordered: TaskItem[]; formula: string } {
    const tasks = this.db.prepare(
      "SELECT * FROM tasks WHERE status IN ('pending','blocked')"
    ).all() as TaskItem[];

    // Check dependencies and update status
    for (const task of tasks) {
      const deps: string[] = JSON.parse(task.dependencies || "[]");
      const allDone = deps.every((depId) => {
        const dep = this.get(depId);
        return dep && dep.status === "completed";
      });
      const anyBlocked = deps.some((depId) => {
        const dep = this.get(depId);
        return dep && dep.status === "blocked";
      });

      if (!allDone) {
        if (anyBlocked) {
          this.db.prepare("UPDATE tasks SET status = 'blocked', priority_score = 0 WHERE id = ?").run(task.id);
        }
        continue;
      }
      if (task.status === "blocked") {
        this.db.prepare("UPDATE tasks SET status = 'pending' WHERE id = ?").run(task.id);
      }

      // Priority formula: urgency * 0.4 + effort_reciprocal * 0.3 + dependency_unblock * 0.3
      const effortReciprocal = task.effort_estimate > 0 ? 1 / task.effort_estimate : 1;
      const depUnblock = deps.length === 0 ? 0.5 : deps.filter((d) => {
        const dep = this.get(d);
        return dep && dep.status === "completed";
      }).length / deps.length;

      const score = task.urgency * 0.4 + effortReciprocal * 0.3 + depUnblock * 0.3;
      this.db.prepare("UPDATE tasks SET priority_score = ? WHERE id = ?").run(Math.round(score * 100) / 100, task.id);
    }

    const reordered = this.db.prepare(
      "SELECT * FROM tasks WHERE status IN ('pending','blocked') ORDER BY priority_score DESC"
    ).all() as TaskItem[];

    return {
      reordered,
      formula: "urgency * 0.4 + (1/effort) * 0.3 + deps_completed_ratio * 0.3",
    };
  }

  next(k: number = 1): TaskItem[] {
    return this.db.prepare(
      "SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority_score DESC LIMIT ?"
    ).all(k) as TaskItem[];
  }

  complete(id: string): TaskItem | null {
    this.db.prepare(`
      UPDATE tasks SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(id);

    // Unblock dependents
    const all = this.db.prepare("SELECT * FROM tasks WHERE status = 'blocked'").all() as TaskItem[];
    for (const task of all) {
      const deps: string[] = JSON.parse(task.dependencies || "[]");
      if (!deps.includes(id)) continue;
      const allDone = deps.every((depId) => {
        const dep = this.get(depId);
        return dep && dep.status === "completed";
      });
      if (allDone) {
        this.db.prepare("UPDATE tasks SET status = 'pending' WHERE id = ?").run(task.id);
      }
    }

    return this.get(id);
  }

  blockedBy(id: string): { task: TaskItem | null; blockers: TaskItem[] } {
    const task = this.get(id);
    if (!task) return { task: null, blockers: [] };
    const deps: string[] = JSON.parse(task.dependencies || "[]");
    const blockers = deps
      .map((depId) => this.get(depId))
      .filter((d): d is TaskItem => d !== null && d.status !== "completed");
    return { task, blockers };
  }

  stats(): { depth: number; avg_wait: number; completion_rate: number } {
    const total = this.db.prepare("SELECT COUNT(*) as c FROM tasks").get() as any;
    const completed = this.db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'completed'").get() as any;
    const pending = this.db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'").get() as any;

    // Average wait time for completed tasks
    const waitResult = this.db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(created_at)) * 86400
      ) as avg_wait FROM tasks WHERE status = 'completed'
    `).get() as any;

    return {
      depth: pending?.c || 0,
      avg_wait: Math.round((waitResult?.avg_wait || 0) * 100) / 100,
      completion_rate: total?.c > 0 ? Math.round(((completed?.c || 0) / total.c) * 10000) / 100 : 0,
    };
  }

  private get(id: string): TaskItem | undefined {
    return this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskItem | undefined;
  }
}
