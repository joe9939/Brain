import { describe, test, expect } from "bun:test";
import { extractSummary } from "./summary.js";

describe("extractSummary", () => {
  test("parses goal from session context", () => {
    const ctx = "goal: Build a login system for the app";
    const result = extractSummary(ctx);
    expect(result.goal).toBe("Build a login system for the app");
  });

  test("parses objective alias", () => {
    const ctx = "objective: Fix database migration issue";
    const result = extractSummary(ctx);
    expect(result.goal).toBe("Fix database migration issue");
  });

  test("parses task alias", () => {
    const ctx = "task: Refactor auth module";
    const result = extractSummary(ctx);
    expect(result.goal).toBe("Refactor auth module");
  });

  test("returns Unknown when no goal found", () => {
    const ctx = "just some random text without a goal";
    const result = extractSummary(ctx);
    expect(result.goal).toBe("Unknown");
  });

  test("extracts key decisions", () => {
    const ctx = "decision: Use PostgreSQL over MySQL\ndecided: Switch to GraphQL";
    const result = extractSummary(ctx);
    expect(result.key_decisions.length).toBeGreaterThanOrEqual(2);
    expect(result.key_decisions[0].decision).toBe("Use PostgreSQL over MySQL");
  });

  test("extracts errors and issues", () => {
    const ctx = "error: Null pointer in UserService\nerror: Timeout in DB connection";
    const result = extractSummary(ctx);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors[0].error).toBe("Null pointer in UserService");
  });

  test("extracts lessons and takeaways", () => {
    const ctx = "lesson: Always validate input\nlearned: Use connection pooling";
    const result = extractSummary(ctx);
    expect(result.lessons.length).toBeGreaterThanOrEqual(2);
    expect(result.lessons[0]).toBe("Always validate input");
  });

  test("handles empty context", () => {
    const result = extractSummary("");
    expect(result.goal).toBe("Unknown");
    expect(result.key_decisions).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.lessons).toEqual([]);
  });

  test("returns proper structure", () => {
    const ctx = "goal: Test session\n" +
      "decision: Use TypeScript\n" +
      "error: Bug in parser\n" +
      "lesson: Test early\n";
    const result = extractSummary(ctx);
    expect(result).toHaveProperty("goal");
    expect(result).toHaveProperty("key_decisions");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("lessons");
  });
});
