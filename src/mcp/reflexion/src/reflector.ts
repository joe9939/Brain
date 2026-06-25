import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ReflexionCycle {
  id: string;
  task_id: string;
  goal: string;
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
}

export interface Observation {
  id: number;
  cycle_id: string;
  observation: string;
  type: "success" | "failure" | "surprise";
  created_at: string;
}

export interface Lesson {
  lesson: string;
  type: "success" | "failure" | "surprise";
}

export interface SkillSuggestion {
  lesson: string;
  suggestion: string;
  actionable: boolean;
}

export class Reflector {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, "..", "reflexion.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflexion_cycles (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('success','failure','surprise')),
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cycle_id) REFERENCES reflexion_cycles(id)
      );
      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id TEXT NOT NULL,
        lesson TEXT NOT NULL,
        type TEXT NOT NULL,
        applied INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cycle_id) REFERENCES reflexion_cycles(id)
      );
      CREATE TABLE IF NOT EXISTS skill_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id TEXT NOT NULL,
        lesson TEXT NOT NULL,
        suggestion TEXT NOT NULL,
        actionable INTEGER DEFAULT 0,
        applied INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cycle_id) REFERENCES reflexion_cycles(id)
      );
      CREATE INDEX IF NOT EXISTS idx_obs_cycle ON observations(cycle_id);
      CREATE INDEX IF NOT EXISTS idx_lessons_cycle ON lessons(cycle_id);
      CREATE INDEX IF NOT EXISTS idx_suggestions_cycle ON skill_suggestions(cycle_id);
    `);
  }

  start(taskId: string, goal: string): ReflexionCycle {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO reflexion_cycles (id, task_id, goal, status)
      VALUES (?, ?, ?, 'active')
    `).run(id, taskId, goal);
    return this.getCycle(id)!;
  }

  addObservation(cycleId: string, observation: string, type: "success" | "failure" | "surprise"): Observation {
    const result = this.db.prepare(`
      INSERT INTO observations (cycle_id, observation, type)
      VALUES (?, ?, ?)
    `).run(cycleId, observation, type);
    return {
      id: result.lastInsertRowid as number,
      cycle_id: cycleId,
      observation,
      type,
      created_at: new Date().toISOString(),
    };
  }

  generateLessons(cycleId: string): Lesson[] {
    const cycle = this.getCycle(cycleId);
    if (!cycle) return [];

    const observations = this.db.prepare(
      "SELECT * FROM observations WHERE cycle_id = ? ORDER BY created_at"
    ).all(cycleId) as Observation[];

    if (observations.length === 0) {
      const defaultLesson: Lesson = { lesson: "No observations recorded for this cycle", type: "surprise" };
      this.storeLesson(cycleId, defaultLesson.lesson, defaultLesson.type);
      return [defaultLesson];
    }

    const lessons: Lesson[] = [];

    // Synthesize lessons from observations
    const successes = observations.filter((o) => o.type === "success");
    const failures = observations.filter((o) => o.type === "failure");
    const surprises = observations.filter((o) => o.type === "surprise");

    if (successes.length > 0) {
      const summary = successes.map((s) => s.observation).join("; ");
      lessons.push({
        lesson: `What worked: ${summary}`,
        type: "success",
      });
    }

    if (failures.length > 0) {
      const summary = failures.map((f) => f.observation).join("; ");
      lessons.push({
        lesson: `What failed: ${summary}`,
        type: "failure",
      });
    }

    if (surprises.length > 0) {
      const summary = surprises.map((s) => s.observation).join("; ");
      lessons.push({
        lesson: `Unexpected: ${summary}`,
        type: "surprise",
      });
    }

    // Store all lessons
    for (const lesson of lessons) {
      this.storeLesson(cycleId, lesson.lesson, lesson.type);
    }

    return lessons;
  }

  suggestSkill(lesson: string): SkillSuggestion {
    const lower = lesson.toLowerCase();
    let suggestion: string;
    let actionable: boolean;

    if (lower.includes("what worked")) {
      suggestion = `Reinforce pattern: ${lesson.replace("What worked: ", "")}`;
      actionable = true;
    } else if (lower.includes("what failed")) {
      suggestion = `Add counter-rule to prevent: ${lesson.replace("What failed: ", "")}`;
      actionable = true;
    } else if (lower.includes("unexpected")) {
      suggestion = `Monitor pattern: ${lesson.replace("Unexpected: ", "")}`;
      actionable = false;
    } else {
      suggestion = `Review: ${lesson}`;
      actionable = false;
    }

    return { lesson, suggestion, actionable };
  }

  apply(cycleId: string): { applied: number; message: string } {
    const cycle = this.getCycle(cycleId);
    if (!cycle) return { applied: 0, message: "Cycle not found" };

    const suggestions = this.db.prepare(
      "SELECT * FROM skill_suggestions WHERE cycle_id = ? AND applied = 0"
    ).all(cycleId) as SkillSuggestion[];

    this.db.prepare(`
      UPDATE skill_suggestions SET applied = 1 WHERE cycle_id = ? AND applied = 0
    `).run(cycleId);

    this.db.prepare(`
      UPDATE reflexion_cycles SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(cycleId);

    return {
      applied: suggestions.length,
      message: `Applied ${suggestions.length} suggestions from cycle ${cycleId}`,
    };
  }

  history(k: number = 10): ReflexionCycle[] {
    return this.db.prepare(
      "SELECT * FROM reflexion_cycles ORDER BY created_at DESC LIMIT ?"
    ).all(k) as ReflexionCycle[];
  }

  private getCycle(id: string): ReflexionCycle | undefined {
    return this.db.prepare("SELECT * FROM reflexion_cycles WHERE id = ?").get(id) as ReflexionCycle | undefined;
  }

  private storeLesson(cycleId: string, lesson: string, type: string): void {
    this.db.prepare(`
      INSERT INTO lessons (cycle_id, lesson, type) VALUES (?, ?, ?)
    `).run(cycleId, lesson, type);
  }
}
