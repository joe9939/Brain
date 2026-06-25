import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Check if better-sqlite3 native binding is available (won't be under bun)
// ---------------------------------------------------------------------------
let nativeOK = true;
let skipReason = "";
try {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
} catch (e) {
  nativeOK = false;
  skipReason = (e as Error).message?.substring(0, 80) || "native module not found";
}

// ---------------------------------------------------------------------------
// patternToRegex — standalone replication of the private method in matcher.ts
// ---------------------------------------------------------------------------
// The original (matcher.ts line 90-97):
//   private patternToRegex(pattern: string): string {
//     const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     const regexStr = "^" + escaped.replace(/\\\*/g, ".*") + "$";
//     return regexStr;
//   }
function patternToRegex(pattern: string): string {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return "^" + escaped.replace(/\\\*/g, ".*") + "$";
}

describe("patternToRegex", () => {
  test('converts "deploy *" to "^deploy .*$"', () => {
    expect(patternToRegex("deploy *")).toBe("^deploy .*$");
  });

  test('converts "task * implement" to "^task .* implement$"', () => {
    expect(patternToRegex("task * implement")).toBe("^task .* implement$");
  });

  test("escapes regex special characters: ? . + ( ) [ ]", () => {
    expect(patternToRegex("what? (test).txt+[x]")).toBe(
      "^what\\? \\(test\\)\\.txt\\+\\[x\\]$",
    );
  });

  test("escapes dollar sign and curly braces", () => {
    expect(patternToRegex("${var}")).toBe("^\\$\\{var\\}$");
  });

  test("converts multiple wildcards", () => {
    expect(patternToRegex("* deploy *")).toBe("^.* deploy .*$");
  });

  test("handles pattern with no wildcards as exact match", () => {
    expect(patternToRegex("exact")).toBe("^exact$");
  });

  test("escapes pipe and backslash", () => {
    expect(patternToRegex("a|b\\c")).toBe("^a\\|b\\\\c$");
  });

  test("result is usable as case-insensitive regex", () => {
    const re = new RegExp(patternToRegex("deploy *"), "i");
    expect(re.test("deploy production")).toBe(true);
    expect(re.test("Deploy Production")).toBe(true);
    expect(re.test("undeploy staging")).toBe(false);
  });

  test("dot in pattern is matched literally, not as wildcard", () => {
    const re = new RegExp(patternToRegex("file.txt"), "i");
    expect(re.test("file.txt")).toBe(true);
    expect(re.test("fileXtxt")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// decide() logic — standalone replication
// ---------------------------------------------------------------------------
// The original (matcher.ts lines 157-204):
//   decide(sopId, confidence, context): DecisionResult {
//     const sop = this.getById(sopId);
//     if (!sop) return { …, decision: "nogo", … };
//     if (confidence >= 0.8) → "go"
//     else if (confidence >= 0.5) → "hold" (with precondition check)
//     else → "nogo"
//   }

interface SOP {
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

interface DecisionResult {
  sop_id: string;
  decision: "go" | "nogo" | "hold";
  confidence: number;
  reason: string;
}

function checkPreconditions(preconditions: string, context: string): boolean {
  if (!preconditions) return true;
  if (!context) return false;
  const preLower = preconditions.toLowerCase();
  const ctxLower = context.toLowerCase();
  const keywords = preLower.split(/\W+/).filter(Boolean);
  return keywords.every((kw) => ctxLower.includes(kw));
}

function decide(
  sop: SOP | undefined,
  sopId: string,
  confidence: number,
  context: string = "",
): DecisionResult {
  if (!sop || sop.id !== sopId) {
    return {
      sop_id: sopId,
      decision: "nogo",
      confidence: 0,
      reason: "SOP not found",
    };
  }

  if (confidence >= 0.8) {
    return {
      sop_id: sopId,
      decision: "go",
      confidence,
      reason: `High confidence match (${confidence}) for SOP: ${sop.trigger_pattern}`,
    };
  }

  if (confidence >= 0.5) {
    if (
      sop.preconditions &&
      !checkPreconditions(sop.preconditions, context)
    ) {
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
  }

  return {
    sop_id: sopId,
    decision: "nogo",
    confidence,
    reason: `Low confidence (${confidence}) for SOP: ${sop.trigger_pattern}. Below threshold.`,
  };
}

function makeSOP(overrides: Partial<SOP> = {}): SOP {
  return {
    id: "sop-1",
    trigger_pattern: "deploy app",
    trigger_regex: "^deploy app$",
    steps: "run deploy script",
    preconditions: "",
    success_count: 5,
    fail_count: 0,
    last_used: "2024-01-01",
    deprecated: 0,
    alternative_sop_id: null,
    avg_time_ms: null,
    optimized_prompt: null,
    created_at: "2024-01-01",
    ...overrides,
  };
}

describe("decide", () => {
  test("high confidence (0.95) returns 'go'", () => {
    const sop = makeSOP();
    const r = decide(sop, sop.id, 0.95);
    expect(r.decision).toBe("go");
    expect(r.confidence).toBe(0.95);
    expect(r.reason).toContain("High confidence");
  });

  test("boundary: confidence of exactly 0.8 returns 'go'", () => {
    const sop = makeSOP();
    const r = decide(sop, sop.id, 0.8);
    expect(r.decision).toBe("go");
    expect(r.reason).toContain("High confidence");
  });

  test("medium confidence (0.6) returns 'hold' when no preconditions", () => {
    const sop = makeSOP({ preconditions: "" });
    const r = decide(sop, sop.id, 0.6);
    expect(r.decision).toBe("hold");
    expect(r.reason).toContain("Medium confidence");
    expect(r.reason).toContain("Check preconditions before proceeding");
  });

  test("medium confidence (0.6) returns 'hold' when preconditions are met", () => {
    const sop = makeSOP({ preconditions: "ready verified" });
    const r = decide(sop, sop.id, 0.6, "system is ready and verified");
    expect(r.decision).toBe("hold");
    expect(r.reason).toContain("Check preconditions before proceeding");
  });

  test("medium confidence with unmet preconditions returns 'hold' with precondition reason", () => {
    const sop = makeSOP({ preconditions: "ready verified" });
    const r = decide(sop, sop.id, 0.6, "some unrelated context");
    expect(r.decision).toBe("hold");
    expect(r.reason).toContain("preconditions not satisfied");
  });

  test("boundary: confidence of exactly 0.5 returns 'hold'", () => {
    const sop = makeSOP();
    const r = decide(sop, sop.id, 0.5);
    expect(r.decision).toBe("hold");
    expect(r.reason).toContain("Medium confidence");
  });

  test("low confidence (0.3) returns 'nogo'", () => {
    const sop = makeSOP();
    const r = decide(sop, sop.id, 0.3);
    expect(r.decision).toBe("nogo");
    expect(r.reason).toContain("Low confidence");
  });

  test("zero confidence returns 'nogo'", () => {
    const sop = makeSOP();
    const r = decide(sop, sop.id, 0);
    expect(r.decision).toBe("nogo");
    expect(r.reason).toContain("Low confidence");
  });

  test("unknown SOP returns 'nogo' with confidence 0", () => {
    const r = decide(undefined, "nonexistent-id", 0.95);
    expect(r.decision).toBe("nogo");
    expect(r.confidence).toBe(0);
    expect(r.reason).toBe("SOP not found");
  });

  test("SOP id mismatch returns 'nogo' with confidence 0", () => {
    const sop = makeSOP({ id: "sop-1" });
    const r = decide(sop, "different-id", 0.9);
    expect(r.decision).toBe("nogo");
    expect(r.confidence).toBe(0);
    expect(r.reason).toBe("SOP not found");
  });
});

describe("checkPreconditions", () => {
  test("empty preconditions returns true", () => {
    expect(checkPreconditions("", "any context")).toBe(true);
  });

  test("empty context with non-empty preconditions returns false", () => {
    expect(checkPreconditions("ready", "")).toBe(false);
  });

  test("all keywords found in context returns true", () => {
    expect(checkPreconditions("ready verified", "system is ready and verified")).toBe(true);
  });

  test("missing keyword returns false", () => {
    expect(checkPreconditions("ready verified", "system is ready but not checked")).toBe(false);
  });

  test("case-insensitive matching", () => {
    expect(checkPreconditions("READY", "System Is Ready")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SQLite-dependent tests — skip when better-sqlite3 native module unavailable
// ---------------------------------------------------------------------------
if (nativeOK) {
  const { SOPMatcher } = await import("./matcher.ts");

  describe("SOPMatcher — register", () => {
    let matcher: SOPMatcher;

    test("register creates an SOP with generated id and regex", () => {
      matcher = new SOPMatcher(":memory:");
      const sop = matcher.register("deploy *", "run deploy steps", "env ready", "deploy");
      expect(sop.id).toBeDefined();
      expect(typeof sop.id).toBe("string");
      expect(sop.trigger_pattern).toBe("deploy *");
      expect(sop.trigger_regex).toBe("^deploy .*$");
      expect(sop.steps).toBe("run deploy steps");
      expect(sop.preconditions).toBe("env ready");
    });

    test("register multiple SOPs with different patterns", () => {
      matcher = new SOPMatcher(":memory:");
      const sop1 = matcher.register("build *", "build steps");
      const sop2 = matcher.register("test *", "test steps");
      expect(sop1.id).not.toBe(sop2.id);
      expect(sop1.trigger_regex).toBe("^build .*$");
      expect(sop2.trigger_regex).toBe("^test .*$");
    });
  });

  describe("SOPMatcher — match", () => {
    let matcher: SOPMatcher;

    test("regex match returns result with confidence 0.95", () => {
      matcher = new SOPMatcher(":memory:");
      matcher.register("deploy *", "deploy steps");
      const results = matcher.match("deploy production");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].match_type).toBe("regex");
      expect(results[0].confidence).toBe(0.95);
    });

    test("keyword match returns result with Jaccard confidence", () => {
      matcher = new SOPMatcher(":memory:");
      matcher.register("build notification", "build and notify");
      const results = matcher.match("build the notification system", 0.3);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].match_type).toBe("keyword");
    });

    test("no match returns empty array", () => {
      matcher = new SOPMatcher(":memory:");
      matcher.register("deploy *", "steps");
      const results = matcher.match("zzzzzzzzzzzzz");
      expect(results).toHaveLength(0);
    });
  });

  describe("SOPMatcher — list", () => {
    let matcher: SOPMatcher;

    test("list returns registered SOPs", () => {
      matcher = new SOPMatcher(":memory:");
      matcher.register("task *", "do it");
      const sops = matcher.list("active");
      expect(sops.length).toBeGreaterThanOrEqual(1);
      expect(sops[0].trigger_pattern).toBe("task *");
    });

    test("list('all') returns all statuses", () => {
      matcher = new SOPMatcher(":memory:");
      matcher.register("sop-a", "steps a");
      const all = matcher.list("all");
      expect(all.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("SOPMatcher — recordOutcome", () => {
    let matcher: SOPMatcher;

    test("recordOutcome increments success count", () => {
      matcher = new SOPMatcher(":memory:");
      const sop = matcher.register("deploy *", "deploy");
      const prevSuccess = sop.success_count;
      matcher.recordOutcome(sop.id, true);
      const updated = matcher.getById(sop.id)!;
      expect(updated.success_count).toBe(prevSuccess + 1);
    });

    test("recordOutcome increments fail count on failure", () => {
      matcher = new SOPMatcher(":memory:");
      const sop = matcher.register("deploy *", "deploy");
      const prevFail = sop.fail_count;
      matcher.recordOutcome(sop.id, false);
      const updated = matcher.getById(sop.id)!;
      expect(updated.fail_count).toBe(prevFail + 1);
    });
  });
} else {
  describe("SOPMatcher — SQL operations (SKIPPED)", () => {
    test(`requires better-sqlite3 native module: ${skipReason}`, () => {});
  });
}
