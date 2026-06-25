import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SOP {
  id: string;
  trigger_pattern: string;
  trigger_regex: string | null;
  steps: string;
  preconditions: string;
  success_count: number;
  fail_count: number;
  last_used: string | null;
  deprecated: number;
  alternative_sop_id: string | null;
  avg_time_ms: number | null;
  optimized_prompt: string | null;
  created_at: string;
}

export interface MatchResult {
  sop_id: string;
  trigger_pattern: string;
  confidence: number;
  match_type: "regex" | "keyword" | "embedding" | "none";
}

export interface DecisionResult {
  sop_id: string;
  decision: "go" | "nogo" | "hold";
  confidence: number;
  reason: string;
}

export class SOPMatcher {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, "..", "sop-tracker.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS procedural_memory (
        id TEXT PRIMARY KEY,
        trigger_pattern TEXT NOT NULL,
        trigger_regex TEXT,
        steps TEXT NOT NULL,
        preconditions TEXT,
        tags TEXT,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_used TEXT,
        deprecated INTEGER DEFAULT 0,
        alternative_sop_id TEXT,
        avg_time_ms INTEGER,
        optimized_prompt TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sop_trigger ON procedural_memory(trigger_pattern);
      CREATE INDEX IF NOT EXISTS idx_sop_status ON procedural_memory(status);
    `);
  }

  register(
    triggerPattern: string,
    steps: string,
    preconditions: string = "",
    tags: string = ""
  ): SOP {
    const id = randomUUID();
    const triggerRegex = this.patternToRegex(triggerPattern);

    const stmt = this.db.prepare(`
      INSERT INTO procedural_memory (id, trigger_pattern, trigger_regex, steps, preconditions, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    stmt.run(id, triggerPattern, triggerRegex, steps, preconditions, tags);

    return this.getById(id)!;
  }

  private patternToRegex(pattern: string): string {
    // Convert simple wildcard pattern to regex:
    // "deploy *" → /^deploy .*$/i
    // "task * implement" → /^task .* implement$/i
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexStr = "^" + escaped.replace(/\\\*/g, ".*") + "$";
    return regexStr;
  }

  match(
    taskDescription: string,
    threshold: number = 0.7
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const sops = this.list("active");

    // Phase 1: Try regex matching first (strongest signal)
    for (const sop of sops) {
      if (sop.trigger_regex) {
        try {
          const re = new RegExp(sop.trigger_regex, "i");
          if (re.test(taskDescription)) {
            results.push({
              sop_id: sop.id,
              trigger_pattern: sop.trigger_pattern,
              confidence: 0.95,
              match_type: "regex",
            });
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    // Phase 2: Keyword overlap
    const taskLower = taskDescription.toLowerCase();
    const taskWords = new Set(taskLower.split(/\W+/).filter(Boolean));

    for (const sop of sops) {
      if (results.some((r) => r.sop_id === sop.id)) continue; // Already matched via regex
      const patternLower = sop.trigger_pattern.toLowerCase();
      const patternWords = new Set(patternLower.split(/\W+/).filter(Boolean));

      if (patternWords.size === 0) continue;

      let overlap = 0;
      for (const word of taskWords) {
        if (patternWords.has(word)) overlap++;
      }
      const jaccard = overlap / (taskWords.size + patternWords.size - overlap);

      if (jaccard >= threshold) {
        results.push({
          sop_id: sop.id,
          trigger_pattern: sop.trigger_pattern,
          confidence: Math.round(jaccard * 100) / 100,
          match_type: "keyword",
        });
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, 10);
  }

  decide(
    sopId: string,
    confidence: number,
    context: string = ""
  ): DecisionResult {
    const sop = this.getById(sopId);
    if (!sop) {
      return {
        sop_id: sopId,
        decision: "nogo",
        confidence: 0,
        reason: "SOP not found",
      };
    }

    // Decision rules
    if (confidence >= 0.8) {
      return {
        sop_id: sopId,
        decision: "go",
        confidence,
        reason: `High confidence match (${confidence}) for SOP: ${sop.trigger_pattern}`,
      };
    } else if (confidence >= 0.5) {
      // Check preconditions
      if (sop.preconditions && !this.checkPreconditions(sop.preconditions, context)) {
        return {
          sop_id: sopId,
          decision: "hold",
          confidence,
          reason: `Medium confidence (${confidence}) but preconditions not satisfied. SOP: ${sop.trigger_pattern}`,
        };
      }
      return {
        sop_id: sopId,
        decision: "hold",
        confidence,
        reason: `Medium confidence (${confidence}). Check preconditions before proceeding. SOP: ${sop.trigger_pattern}`,
      };
    } else {
      return {
        sop_id: sopId,
        decision: "nogo",
        confidence,
        reason: `Low confidence (${confidence}) for SOP: ${sop.trigger_pattern}. Below threshold.`,
      };
    }
  }

  recordOutcome(sopId: string, success: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE procedural_memory
      SET success_count = success_count + ?,
          fail_count = fail_count + ?,
          last_used = datetime('now')
      WHERE id = ?
    `);
    stmt.run(success ? 1 : 0, success ? 0 : 1, sopId);
  }

  list(status: string = "active"): SOP[] {
    let rows: SOP[];
    if (status === "all") {
      rows = this.db.prepare("SELECT * FROM procedural_memory ORDER BY created_at DESC").all() as SOP[];
    } else {
      rows = this.db.prepare("SELECT * FROM procedural_memory WHERE status = ? ORDER BY created_at DESC").all(status) as SOP[];
    }
    return rows;
  }

  getById(id: string): SOP | undefined {
    const row = this.db.prepare("SELECT * FROM procedural_memory WHERE id = ?").get(id) as SOP | undefined;
    return row;
  }

  private checkPreconditions(preconditions: string, context: string): boolean {
    if (!preconditions) return true;
    if (!context) return false;
    const preLower = preconditions.toLowerCase();
    const ctxLower = context.toLowerCase();
    // Simple check: all precondition keywords must appear in context
    const keywords = preLower.split(/\W+/).filter(Boolean);
    return keywords.every((kw) => ctxLower.includes(kw));
  }
}
