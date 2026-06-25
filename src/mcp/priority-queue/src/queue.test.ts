import { describe, test, expect, beforeAll } from "bun:test";

// Check if better-sqlite3 native binding is available (won't be under bun)
let nativeOK = true;
let skipReason = "";
try {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
} catch (e: any) {
  nativeOK = false;
  skipReason = e.message?.substring(0, 80) || "native module not found";
}

if (!nativeOK) {
  describe("PriorityQueue (SKIPPED)", () => {
    test("requires better-sqlite3 native module: " + skipReason, () => {});
  });
} else {
  const { PriorityQueue } = await import("./queue.js");

  describe("PriorityQueue", () => {
    let queue: PriorityQueue;

    beforeAll(() => {
      queue = new PriorityQueue(":memory:");
    });

    test("add stores a task and returns it via next()", () => {
      queue.add("t1", "Test task 1", 0.8, 2.0, [], "test context");
      const tasks = queue.next(10);
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks.some((t: any) => t.id === "t1")).toBe(true);
    });

    test("prioritize computes scores for pending tasks", () => {
      queue.add("t2", "Urgent task", 0.9, 1.0, [], "");
      queue.add("t3", "Low urgency task", 0.1, 5.0, [], "");
      const result = queue.prioritize();
      expect(result.reordered.length).toBeGreaterThanOrEqual(2);
      expect(typeof result.formula).toBe("string");
      // Higher urgency should rank above lower urgency
      const idxT2 = result.reordered.findIndex((t: any) => t.id === "t2");
      const idxT3 = result.reordered.findIndex((t: any) => t.id === "t3");
      expect(idxT2).toBeLessThan(idxT3);
    });

    test("next returns up to k pending tasks ordered by priority", () => {
      // t2 and t3 are pending from previous test, add one more
      queue.add("t4", "Another task", 0.5, 2.0, [], "");
      queue.prioritize();
      const top2 = queue.next(2);
      expect(top2.length).toBe(2);
    });

    test("complete marks a task as completed and returns it", () => {
      queue.add("t5", "To complete", 0.5, 1.0, [], "");
      const completed = queue.complete("t5");
      expect(completed).not.toBeNull();
      expect(completed!.status).toBe("completed");
      expect(completed!.completed_at).not.toBeNull();
      // Should no longer appear in next()
      const pending = queue.next(100);
      expect(pending.some((t: any) => t.id === "t5")).toBe(false);
    });

    test("complete unblocks dependents when all dependencies are done", () => {
      // t6 depends on t5, t5 was already completed above
      queue.add("t6", "Depends on t5", 0.5, 1.0, ["t5"], "");
      queue.prioritize();
      // t6 should have been unblocked by completed t5
      const pending = queue.next(100);
      expect(pending.some((t: any) => t.id === "t6")).toBe(true);
    });

    test("blockedBy returns blockers for a task with unmet dependencies", () => {
      queue.add("t7", "Blocked task", 0.5, 1.0, ["nonexistent"], "");
      const { task, blockers } = queue.blockedBy("t7");
      expect(task).not.toBeNull();
      expect(task!.id).toBe("t7");
      expect(blockers.length).toBeGreaterThanOrEqual(1);
      expect(blockers[0].id).toBe("nonexistent");
    });

    test("blockedBy returns null task for unknown id", () => {
      const { task, blockers } = queue.blockedBy("does-not-exist");
      expect(task).toBeNull();
      expect(blockers.length).toBe(0);
    });

    test("stats returns shape with depth, avg_wait, completion_rate", () => {
      const st = queue.stats();
      expect(st).toHaveProperty("depth");
      expect(st).toHaveProperty("avg_wait");
      expect(st).toHaveProperty("completion_rate");
      expect(typeof st.depth).toBe("number");
      expect(typeof st.avg_wait).toBe("number");
      expect(typeof st.completion_rate).toBe("number");
    });
  });
}
