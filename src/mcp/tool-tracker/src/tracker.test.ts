import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// ---------------------------------------------------------------------------
// Conditional skip: better-sqlite3 native binding fails under bun, so wrap
// every test behind a capability check + graceful skip.
// ---------------------------------------------------------------------------
let nativeOK = true;
let skipReason = "";

try {
  const mod = await import("better-sqlite3");
  const Database = (mod as any).default || mod;
  const db = new Database(":memory:");
  db.close();
} catch (e: any) {
  nativeOK = false;
  skipReason = (e.message as string)?.substring(0, 80) || "native module not found";
}

if (!nativeOK) {
  describe("ToolTracker (SKIPPED)", () => {
    test("requires better-sqlite3 native module: " + skipReason, () => {});
  });
} else {
  const { ToolTracker } = await import("./tracker.js");

  describe("ToolTracker", () => {
    let tracker: ToolTracker;

    beforeAll(() => {
      tracker = new ToolTracker(":memory:");
    });

    afterAll(() => {
      tracker.close();
    });

    // -- track() -----------------------------------------------------------

    test("track() inserts records", () => {
      tracker.track("read_file", "/tmp/test.txt", true, 150, "ctx1", "Read test file");
      const stats = tracker.getStats();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats.some((s: any) => s.action_type === "read_file")).toBe(true);
    });

    test("track() with failure status", () => {
      tracker.track("delete_file", "/tmp/missing.txt", false, 0, "ctx_fail", "Delete missing file");
      const stats = tracker.getStats("delete_file");
      expect(stats.length).toBeGreaterThan(0);
      // success_rate should be less than 1.0 if failures exist
      expect(stats[0].success_rate).toBeLessThan(1);
    });

    // -- getStats() --------------------------------------------------------

    test("getStats() returns aggregated stats", () => {
      tracker.track("write_file", "/tmp/out.txt", true, 200, "ctx2", "Write test output");
      tracker.track("read_file", "/tmp/another.txt", true, 100, "ctx3", "Read another file");

      const allStats = tracker.getStats();
      expect(allStats.length).toBeGreaterThanOrEqual(2);

      const readStats = tracker.getStats("read_file");
      expect(readStats.every((s: any) => s.tool_name === "read_file")).toBe(true);
    });

    test("getStats() includes success_rate and avg_duration_ms", () => {
      const stats = tracker.getStats("read_file");
      expect(stats.length).toBeGreaterThan(0);
      const s = stats[0];
      expect(typeof s.success_rate).toBe("number");
      expect(typeof s.avg_duration_ms).toBe("number");
    });

    test("getStats() k parameter limits results", () => {
      const limited = tracker.getStats(undefined, 1);
      expect(limited.length).toBeLessThanOrEqual(1);
    });

    // -- getTimeline() -----------------------------------------------------

    test("getTimeline() returns records in descending order", () => {
      const timeline = tracker.getTimeline();
      expect(timeline.length).toBeGreaterThanOrEqual(3);
      for (const t of timeline) {
        expect(t).toHaveProperty("tool_name");
        expect(t).toHaveProperty("action_type");
        expect(t).toHaveProperty("success");
        expect(t).toHaveProperty("duration_ms");
        expect(t).toHaveProperty("created_at");
      }
      // Confirm descending time order
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].created_at.localeCompare(timeline[i - 1].created_at)).toBeLessThanOrEqual(0);
      }
    });

    test("getTimeline() with date range filters correctly", () => {
      const filtered = tracker.getTimeline("2020-01-01", "2030-12-31");
      expect(filtered.length).toBeGreaterThanOrEqual(1);

      const empty = tracker.getTimeline("2099-01-01", "2099-12-31");
      expect(empty.length).toBe(0);
    });

    test("getTimeline() with k limit", () => {
      const limited = tracker.getTimeline(undefined, undefined, 2);
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    // -- recommend() -------------------------------------------------------

    test("recommend() returns scored suggestions", () => {
      tracker.track("read_file", "/tmp/data.csv", true, 120, "ctx5", "Parse CSV data file");
      const recs = tracker.recommend("parse CSV data file");
      expect(recs.length).toBeGreaterThan(0);
      for (const r of recs) {
        expect(r).toHaveProperty("tool_name");
        expect(r).toHaveProperty("score");
        expect(r).toHaveProperty("success_rate");
        expect(r).toHaveProperty("count");
      }
      // Scores must be descending
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i].score).toBeLessThanOrEqual(recs[i - 1].score);
      }
    });

    test("recommend() returns empty for very short query", () => {
      const recs = tracker.recommend("a");
      expect(recs.length).toBe(0);
    });

    test("recommend() k parameter limits results", () => {
      const recs = tracker.recommend("file data", 1);
      expect(recs.length).toBeLessThanOrEqual(1);
    });

    // -- cross-operation consistency ---------------------------------------

    test("multiple track calls are reflected in subsequent reads", () => {
      const before = tracker.getStats();
      const beforeCount = before.reduce((sum: number, s: any) => sum + s.count, 0);

      tracker.track("list_dir", "/home", true, 30, "ctx6", "List home directory contents");

      const after = tracker.getStats();
      const afterCount = after.reduce((sum: number, s: any) => sum + s.count, 0);
      expect(afterCount).toBe(beforeCount + 1);
    });
  });
}
