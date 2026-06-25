import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { applyDecay, getDecayThreshold, DECAY_LAMBDAS } from "./decay.js";

describe("DECAY_LAMBDAS", () => {
  test("has expected types with correct values", () => {
    expect(DECAY_LAMBDAS.episodic).toBe(0.05);
    expect(DECAY_LAMBDAS.procedural).toBe(0.15);
    expect(DECAY_LAMBDAS.semantic).toBe(0.02);
    expect(DECAY_LAMBDAS.working).toBe(0.3);
  });
});

describe("applyDecay", () => {
  test("no decay when just accessed", () => {
    const now = new Date().toISOString();
    const result = applyDecay(1.0, "episodic", now);
    expect(result).toBeCloseTo(1.0, 1);
  });
  test("applies exponential decay", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, "episodic", past);
    expect(result).toBeCloseTo(Math.exp(-0.05 * 1), 2);
  });
  test("exponential decay for procedural type (faster decay)", () => {
    const past = new Date(Date.now() - 86400000 * 7).toISOString();
    const result = applyDecay(1.0, "procedural", past);
    expect(result).toBeCloseTo(Math.exp(-0.15 * 7), 2);
  });
  test("exponential decay for semantic type (slowest decay)", () => {
    const past = new Date(Date.now() - 86400000 * 7).toISOString();
    const result = applyDecay(1.0, "semantic", past);
    expect(result).toBeCloseTo(Math.exp(-0.02 * 7), 2);
  });
  test("exponential decay for working type (fastest decay)", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = applyDecay(1.0, "working", past);
    expect(result).toBeCloseTo(Math.exp(-0.3 * 1), 2);
  });
  test("uses default lambda for unknown type", () => {
    const past = new Date(Date.now() - 86400000 * 3).toISOString();
    const result = applyDecay(1.0, "unknown_type", past);
    expect(result).toBeCloseTo(Math.exp(-0.1 * 3), 2);
  });
  test("score of 0 stays 0", () => {
    const past = new Date(Date.now() - 86400000 * 30).toISOString();
    expect(applyDecay(0, "episodic", past)).toBe(0);
  });
});

describe("getDecayThreshold", () => {
  test("returns ISO string from 30 days ago", () => {
    expect(getDecayThreshold()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  test("returns ISO string from custom days", () => {
    expect(getDecayThreshold(7)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
