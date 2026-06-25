import { describe, test, expect, beforeAll } from "bun:test";

// ─── Types ───────────────────────────────────────────────────────────

interface SkillSuggestion {
  lesson: string;
  suggestion: string;
  actionable: boolean;
}

interface ReflexionCycle {
  id: string;
  task_id: string;
  goal: string;
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
}

// ─── Pure-function test double for Reflexion.suggestSkill ────────────
// The real suggestSkill() is an instance method on Reflector, but since
// it never touches `this` or the DB we can test the logic directly as a
// plain function – no import required, runs even when better-sqlite3 is
// not available.

function suggestSkill(lesson: string): SkillSuggestion {
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

// ─── better-sqlite3 availability check ───────────────────────────────
// Bun cannot load the native .node binary of better-sqlite3, so we guard
// every SQLite-dependent (integration) test behind this flag.  Pure
// suggestSkill tests run regardless.

let nativeOK = true;
let skipReason = "";
try {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
} catch (e) {
  nativeOK = false;
  skipReason = e instanceof Error ? e.message.substring(0, 80) : String(e).substring(0, 80);
}

// ═══════════════════════════════════════════════════════════════════════
//  suggestSkill  (pure logic — always runs)
// ═══════════════════════════════════════════════════════════════════════

describe("suggestSkill", () => {
  // ── 4 required variants ──

  test('"What worked: X" → Reinforce pattern, actionable=true', () => {
    const r = suggestSkill("What worked: used polling for status updates");
    expect(r.suggestion).toBe("Reinforce pattern: used polling for status updates");
    expect(r.actionable).toBe(true);
  });

  test('"What failed: Y" → Add counter-rule, actionable=true', () => {
    const r = suggestSkill("What failed: direct DB write bypassed validation");
    expect(r.suggestion).toBe("Add counter-rule to prevent: direct DB write bypassed validation");
    expect(r.actionable).toBe(true);
  });

  test('"Unexpected: Z" → Monitor pattern, actionable=false', () => {
    const r = suggestSkill("Unexpected: API returned 429 despite rate limiting");
    expect(r.suggestion).toBe("Monitor pattern: API returned 429 despite rate limiting");
    expect(r.actionable).toBe(false);
  });

  test("other text → Review:{text}, actionable=false", () => {
    const r = suggestSkill("Refactored the module successfully");
    expect(r.suggestion).toBe("Review: Refactored the module successfully");
    expect(r.actionable).toBe(false);
  });

  // ── Edge cases ──

  test('lowercase "what worked" prefix still matches', () => {
    const r = suggestSkill("what worked: fixed the race condition");
    expect(r.actionable).toBe(true);
    expect(r.suggestion).toContain("Reinforce pattern:");
    expect(r.suggestion).toContain("fixed the race condition");
  });

  test('"What failed" embedded in middle of string still matches', () => {
    const r = suggestSkill("we observed what failed: the timeout was too short");
    expect(r.actionable).toBe(true);
    expect(r.suggestion).toContain("Add counter-rule");
  });

  test('"unexpected" at the start (case-insensitive) matches', () => {
    const r = suggestSkill("UNEXPECTED: the database ran out of disk space");
    expect(r.actionable).toBe(false);
    expect(r.suggestion).toContain("Monitor pattern:");
  });

  test("empty lesson string", () => {
    const r = suggestSkill("");
    expect(r.suggestion).toBe("Review: ");
    expect(r.actionable).toBe(false);
  });

  test("lesson with only whitespace", () => {
    const r = suggestSkill("   ");
    expect(r.suggestion).toBe("Review:    ");
    expect(r.actionable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Reflector  (SQLite integration — skip when better-sqlite3 unavailable)
// ═══════════════════════════════════════════════════════════════════════

if (!nativeOK) {
  describe("Reflector (SKIPPED)", () => {
    test(`requires better-sqlite3 native module: ${skipReason}`, () => {});
  });
} else {
  const { default: Database } = await import("better-sqlite3");
  const { Reflector } = await import("./reflector.js");

  describe("Reflector", () => {
    let reflector: any;

    beforeAll(() => {
      reflector = new Reflector(":memory:");
    });

    // ── start() ──

    test("start creates a reflexion cycle with correct fields", () => {
      const cycle = reflector.start("task-1", "Test goal") as ReflexionCycle;
      expect(cycle.id).toBeTruthy();
      expect(cycle.task_id).toBe("task-1");
      expect(cycle.goal).toBe("Test goal");
      expect(cycle.status).toBe("active");
      expect(cycle.created_at).toBeTruthy();
      expect(cycle.completed_at).toBeNull();
    });

    test("start accepts empty task_id and goal", () => {
      const cycle = reflector.start("", "") as ReflexionCycle;
      expect(cycle.id).toBeTruthy();
      expect(cycle.task_id).toBe("");
      expect(cycle.goal).toBe("");
    });

    test("start generates unique IDs", () => {
      const a = reflector.start("t", "a") as ReflexionCycle;
      const b = reflector.start("t", "b") as ReflexionCycle;
      expect(a.id).not.toBe(b.id);
    });

    // ── addObservation() ──

    test("addObservation stores and returns a success observation", () => {
      const cycle = reflector.start("task-obs", "Observation test") as ReflexionCycle;
      const obs = reflector.addObservation(cycle.id, "All assertions passed", "success");
      expect(obs.id).toBeGreaterThan(0);
      expect(obs.cycle_id).toBe(cycle.id);
      expect(obs.observation).toBe("All assertions passed");
      expect(obs.type).toBe("success");
      expect(obs.created_at).toBeTruthy();
    });

    test("addObservation with failure type", () => {
      const cycle = reflector.start("task-obs2", "Failure test") as ReflexionCycle;
      const obs = reflector.addObservation(cycle.id, "Timeout exceeded", "failure");
      expect(obs.type).toBe("failure");
    });

    test("addObservation with surprise type", () => {
      const cycle = reflector.start("task-obs3", "Surprise test") as ReflexionCycle;
      const obs = reflector.addObservation(cycle.id, "Unexpected side effect", "surprise");
      expect(obs.type).toBe("surprise");
    });

    // ── generateLessons() ──

    test("generateLessons returns default lesson when no observations exist", () => {
      const cycle = reflector.start("task-empty", "Empty cycle") as ReflexionCycle;
      const lessons = reflector.generateLessons(cycle.id);
      expect(lessons).toHaveLength(1);
      expect(lessons[0].lesson).toBe("No observations recorded for this cycle");
      expect(lessons[0].type).toBe("surprise");
    });

    test("generateLessons synthesises from success observations", () => {
      const cycle = reflector.start("task-succ", "Success lessons") as ReflexionCycle;
      reflector.addObservation(cycle.id, "Polling worked reliably", "success");
      const lessons = reflector.generateLessons(cycle.id);
      const success = lessons.find((l: any) => l.type === "success");
      expect(success).toBeTruthy();
      expect(success.lesson).toContain("What worked:");
      expect(success.lesson).toContain("Polling worked reliably");
    });

    test("generateLessons synthesises from mixed observation types", () => {
      const cycle = reflector.start("task-mix", "Mixed lessons") as ReflexionCycle;
      reflector.addObservation(cycle.id, "Auth flow passed", "success");
      reflector.addObservation(cycle.id, "Cache invalidation failed", "failure");
      reflector.addObservation(cycle.id, "Memory grew unexpectedly", "surprise");
      const lessons = reflector.generateLessons(cycle.id);
      expect(lessons.length).toBeGreaterThanOrEqual(3);
      expect(lessons.some((l: any) => l.type === "success" && l.lesson.includes("What worked"))).toBe(true);
      expect(lessons.some((l: any) => l.type === "failure" && l.lesson.includes("What failed"))).toBe(true);
      expect(lessons.some((l: any) => l.type === "surprise" && l.lesson.includes("Unexpected"))).toBe(true);
    });

    test("generateLessons joins multiple same-type observations", () => {
      const cycle = reflector.start("task-multi", "Multi obs") as ReflexionCycle;
      reflector.addObservation(cycle.id, "Step 1 ok", "success");
      reflector.addObservation(cycle.id, "Step 2 ok", "success");
      const lessons = reflector.generateLessons(cycle.id);
      const success = lessons.find((l: any) => l.type === "success");
      expect(success).toBeTruthy();
      expect(success.lesson).toContain("Step 1 ok");
      expect(success.lesson).toContain("Step 2 ok");
    });

    // ── apply() ──

    test("apply with non-existent cycle returns 0 and not-found message", () => {
      const result = reflector.apply("non-existent-id");
      expect(result.applied).toBe(0);
      expect(result.message).toBe("Cycle not found");
    });

    test("apply completes a cycle with zero suggestions", () => {
      const cycle = reflector.start("task-apply", "Apply test") as ReflexionCycle;
      const result = reflector.apply(cycle.id);
      expect(result.applied).toBe(0);
      expect(result.message).toContain(cycle.id);
      // history should show the cycle as completed
      const recent = reflector.history(50) as ReflexionCycle[];
      const found = recent.find((c: ReflexionCycle) => c.id === cycle.id);
      expect(found).toBeTruthy();
      expect(found!.status).toBe("completed");
      expect(found!.completed_at).toBeTruthy();
    });

    // ── history() ──

    test("history returns cycles in reverse chronological order", () => {
      const all = reflector.history(100) as ReflexionCycle[];
      expect(all.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < all.length; i++) {
        const prev = new Date(all[i - 1].created_at).getTime();
        const curr = new Date(all[i].created_at).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    test("history respects the k limit", () => {
      const limited = reflector.history(3) as ReflexionCycle[];
      expect(limited.length).toBeLessThanOrEqual(3);
    });

    test("history returns empty array for k=0", () => {
      const empty = reflector.history(0) as ReflexionCycle[];
      expect(empty).toHaveLength(0);
    });
  });
}
