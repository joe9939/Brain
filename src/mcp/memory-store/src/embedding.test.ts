import { describe, test, expect } from "bun:test";
import { cosineSimilarity } from "./embedding.js";

describe("cosineSimilarity", () => {
  test("identical vectors return 1", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  test("orthogonal vectors return 0", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("opposite vectors return -1", () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  test("similar vectors return positive cosine", () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  test("different length vectors return 0", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  test("zero vector returns 0", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  test("both zero vectors returns 0", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  test("handles negative values", () => {
    const a = [1, -1, 1, -1];
    const b = [1, -1, 1, -1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});
