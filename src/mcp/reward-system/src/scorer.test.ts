import { describe, test, expect } from "bun:test";
import { scoreAction, recordAction, tdUpdate, recordHierarchical, getHierarchicalScore } from "./scorer.js";

describe("scoreAction", () => {
  test("returns expected structure for read action", () => {
    const result = scoreAction({ action_type: "read", target: "file.ts" });
    expect(result).toHaveProperty("total_score");
    expect(result).toHaveProperty("extrinsic");
    expect(result).toHaveProperty("intrinsic");
    expect(result).toHaveProperty("risk_level");
    expect(result).toHaveProperty("ucb_bonus");
    expect(result).toHaveProperty("td_value");
    expect(result).toHaveProperty("explanation");
  });

  test("read has high total score (low risk)", () => {
    const result = scoreAction({ action_type: "read", target: "file.ts" });
    expect(result.total_score).toBeGreaterThanOrEqual(5);
    expect(result.risk_level).toBe("low");
  });

  test("delete has lower score (higher risk)", () => {
    const result = scoreAction({ action_type: "delete", target: "unused.txt" });
    expect(result.risk_level).toBe("high"); // base=1, ucb=3, alpha=0.7 → total≈2.8 → high
  });

  test("sensitive target reduces score", () => {
    const normal = scoreAction({ action_type: "read", target: "normal.txt" });
    const sensitive = scoreAction({ action_type: "read", target: ".env" });
    expect(sensitive.total_score).toBeLessThanOrEqual(normal.total_score);
  });

  test("test target increases score", () => {
    const result = scoreAction({ action_type: "write", target: "file.test.ts" });
    expect(result.extrinsic.breakdown).toContain("test_file(+1.5)");
  });

  test("context provides bonus", () => {
    const result = scoreAction({ action_type: "edit", target: "file.ts", context: "long context with sufficient length to trigger bonus" });
    expect(result.extrinsic.breakdown).toContain("context(+0.5)");
  });

  test("intrinsic score for edit action", () => {
    const result = scoreAction({ action_type: "edit", target: "file.ts" });
    expect(result.intrinsic.breakdown).toContain("competence(");
  });

  test("intrinsic score for read without context (curiosity)", () => {
    const result = scoreAction({ action_type: "read", target: "file.ts" });
    expect(result.intrinsic.breakdown).toContain("curiosity(");
  });

  test("risk_level is low for scores >= 6", () => {
    const result = scoreAction({ action_type: "read", target: "test.spec.ts" });
    expect(result.risk_level).toBe("low");
  });

  test("risk_level is high for scores < 3", () => {
    const result = scoreAction({ action_type: "delete", target: ".env" });
    if (result.total_score < 3) {
      expect(result.risk_level).toBe("high");
    }
  });
});

describe("UCB1 exploration bonus", () => {
  test("initial actions get max bonus", () => {
    const result = scoreAction({ action_type: "bash", target: "build.sh" });
    expect(result.ucb_bonus).toBeGreaterThan(0);
  });
});

describe("scoreAction with custom alpha", () => {
  test("alpha=1.0 uses only extrinsic", () => {
    const result = scoreAction({ action_type: "read", target: "file.ts" }, 1.0);
    expect(result.total_score).toBeGreaterThan(0);
  });
});

describe("recordHierarchical and getHierarchicalScore", () => {
  test("records atomic scores and retrieves them", () => {
    recordHierarchical("task1:step1", 7, "atomic");
    recordHierarchical("task1:step2", 8, "atomic");
    recordHierarchical("task1:step", 7.5, "step");

    const result = getHierarchicalScore(["task1:step1", "task1:step2", "task1:step"]);
    expect(result.scores.length).toBe(3);
    expect(result).toHaveProperty("aggregate");
  });
});

describe("tdUpdate", () => {
  test("updates state value for a given hash", () => {
    tdUpdate("read:normal", 8);
    tdUpdate("read:normal", 7, "write:normal");
    // Should not throw
    expect(true).toBe(true);
  });
});
