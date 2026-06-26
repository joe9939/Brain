import { describe, test, expect } from "bun:test";
import { MuGate, DEFAULT_MU_CONFIG } from "./mu-gate.js";
import type { MuGateInput } from "./mu-gate.js";

function makeInput(overrides?: Partial<MuGateInput>): MuGateInput {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  return {
    id: "wm-1",
    priorityScore: 5.0,
    status: "active",
    createdAt: hoursAgo(0.1),    // 6 minutes ago
    updatedAt: hoursAgo(0.05),    // 3 minutes ago
    accessCount: 5,
    ...overrides,
  };
}

describe("MuGate.decide()", () => {
  test("recent memory (<1h) returns RETAIN with high confidence", () => {
    const gate = new MuGate();
    const input = makeInput({ createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() }); // 10 min ago
    const result = gate.decide(input);
    expect(result.decision).toBe("RETAIN");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.reason).toContain("recent");
  });

  test("high importance (>7.0) returns RETAIN regardless of age", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 8.5 });
    const result = gate.decide(input);
    expect(result.decision).toBe("RETAIN");
    expect(result.reason).toContain("importance");
  });

  test("old + low priority + low access returns DISCARD", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 1.0, accessCount: 0 });
    const result = gate.decide(input);
    expect(result.decision).toBe("DISCARD");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test("old but still relevant returns UPDATE", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 5.0, accessCount: 10 });
    const result = gate.decide(input);
    expect(result.decision).toBe("UPDATE");
    expect(result.reason).toContain("relevant");
  });

  test("default returns RETAIN (conservative)", () => {
    const gate = new MuGate();
    const input = makeInput({
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      priorityScore: 5.0,
      accessCount: 5,
    });
    const result = gate.decide(input);
    expect(result.decision).toBe("RETAIN");
    expect(result.confidence).toBe(0.5);
  });

  test("metadata is populated correctly", () => {
    const gate = new MuGate();
    const input = makeInput({ priorityScore: 8.0 });
    const result = gate.decide(input);
    expect(result.metadata.ageHours).toBeGreaterThanOrEqual(0);
    expect(result.metadata.priorityLevel).toBe("high");
  });

  test("low priority with frequent access returns UPDATE", () => {
    const gate = new MuGate();
    const input = makeInput({
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      priorityScore: 2.0,
      accessCount: 10,
    });
    const result = gate.decide(input);
    // priority < 3.0 (low), but accessCount >= 3 (not low access)
    // so: isLowPriority=true, isLowAccess=false → UPDATE
    expect(result.decision).toBe("UPDATE");
    expect(result.reason).toContain("frequently accessed");
  });
});

describe("MuGate.batchDecide()", () => {
  test("sorts by RETAIN first, DISCARD last", () => {
    const gate = new MuGate();
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

    const inputs: MuGateInput[] = [
      makeInput({ id: "wm-1", createdAt: hoursAgo(0.1), priorityScore: 5.0 }),        // RETAIN (recent)
      makeInput({ id: "wm-2", createdAt: hoursAgo(48), priorityScore: 1.0, accessCount: 0 }),  // DISCARD
      makeInput({ id: "wm-3", createdAt: hoursAgo(48), priorityScore: 6.0, accessCount: 10 }), // UPDATE
    ];

    const results = gate.batchDecide(inputs);
    expect(results[0].decision).toBe("RETAIN");
    expect(results[1].decision).toBe("UPDATE");
    expect(results[2].decision).toBe("DISCARD");
  });

  test("empty inputs returns empty array", () => {
    const gate = new MuGate();
    const results = gate.batchDecide([]);
    expect(results).toEqual([]);
  });
});

describe("MuGateConfig overrides", () => {
  test("custom retainRecentHours=0 skips recency check", () => {
    const gate = new MuGate({ retainRecentHours: 0 });
    const recent = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: recent, priorityScore: 5.0 });
    const result = gate.decide(input);
    // Without recency, 5.0 isn't high importance, so default RETAIN with 0.5 confidence
    expect(result.decision).toBe("RETAIN");
    expect(result.confidence).toBe(0.5); // default
  });

  test("discardOldHours=1 aggressively prunes old memories", () => {
    const gate = new MuGate({ discardOldHours: 1, discardLowPriority: 6.0, discardLowAccess: 100 });
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 5.0, accessCount: 0 });
    const result = gate.decide(input);
    // 2h old, priority 5.0 < 6.0, access 0 < 100 → all conditions met
    expect(result.decision).toBe("DISCARD");
  });

  test("retainImportanceThreshold=10 never retains on importance alone", () => {
    const gate = new MuGate({ retainImportanceThreshold: 10 });
    const input = makeInput({
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      priorityScore: 9.0,
      accessCount: 2,
    });
    const result = gate.decide(input);
    // 9.0 < 10, not recent, not discardable either (priority 9 >= 3)
    // old (12h >= 24h? no) → falls to default RETAIN
    expect(result.decision).toBe("RETAIN");
  });

  test("discardLowPriority=1 discards priority 0 as low", () => {
    const gate = new MuGate({ discardLowPriority: 1.0 });
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 0, accessCount: 0 });
    const result = gate.decide(input);
    // 0 < 1 → low priority; old + low priority + low access = DISCARD
    expect(result.decision).toBe("DISCARD");
  });
});

describe("MuGate edge cases", () => {
  test("missing accessCount defaults to 0", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input: MuGateInput = {
      id: "wm-edge",
      priorityScore: 1.0,
      status: "active",
      createdAt: old,
      updatedAt: old,
      // accessCount omitted
    };
    const result = gate.decide(input);
    expect(result.decision).toBe("DISCARD"); // old + low priority + 0 access
  });

  test("zero priority memory is discarded when old and unused", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 0, accessCount: 0 });
    const result = gate.decide(input);
    expect(result.decision).toBe("DISCARD");
  });

  test("maximum priority never discards", () => {
    const gate = new MuGate();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: old, priorityScore: 10, accessCount: 0 });
    const result = gate.decide(input);
    expect(result.decision).toBe("RETAIN");
    expect(result.metadata.priorityLevel).toBe("high");
  });

  test("future created_at does not crash", () => {
    const gate = new MuGate();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt: future });
    const result = gate.decide(input);
    expect(result.metadata.ageHours).toBeLessThan(0);
    expect(["RETAIN", "UPDATE", "DISCARD"]).toContain(result.decision);
  });

  test("hoursSinceUpdate is populated correctly", () => {
    const gate = new MuGate();
    const now = new Date();
    const createdAt = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const updatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const input = makeInput({ createdAt, updatedAt, priorityScore: 5.0 });
    const result = gate.decide(input);
    expect(result.metadata.hoursSinceUpdate).toBeCloseTo(2, 0);
  });
});

describe("MuGateConfig defaults", () => {
  test("DEFAULT_MU_CONFIG has expected values", () => {
    expect(DEFAULT_MU_CONFIG.retainImportanceThreshold).toBe(7.0);
    expect(DEFAULT_MU_CONFIG.retainRecentHours).toBe(1);
    expect(DEFAULT_MU_CONFIG.discardOldHours).toBe(24);
    expect(DEFAULT_MU_CONFIG.discardLowPriority).toBe(3.0);
    expect(DEFAULT_MU_CONFIG.discardLowAccess).toBe(3);
    expect(DEFAULT_MU_CONFIG.updateOverlapThreshold).toBe(0.5);
  });

  test("default config used when no override provided", () => {
    const gate = new MuGate();
    const result = gate.decide(makeInput());
    expect(result).toBeDefined();
  });

  test("partial override merges with defaults", () => {
    const gate = new MuGate({ retainRecentHours: 0.5 });
    const input = makeInput({ createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() }); // 40 min
    const result = gate.decide(input);
    // 40 min = 0.67h, which is > 0.5h, so recency won't trigger
    // priority 5.0 < 7.0, not discardable either
    expect(result.decision).toBe("RETAIN");
    expect(result.confidence).toBe(0.5);
  });
});

describe("MuGate priority level mapping", () => {
  test("priority >= 7.0 is high", () => {
    const gate = new MuGate();
    const result = gate.decide(makeInput({ priorityScore: 7.0 }));
    expect(result.metadata.priorityLevel).toBe("high");
  });

  test("priority between 3.0 and 6.9 is medium", () => {
    const gate = new MuGate();
    const result = gate.decide(makeInput({ priorityScore: 5.0 }));
    expect(result.metadata.priorityLevel).toBe("medium");
  });

  test("priority < 3.0 is low", () => {
    const gate = new MuGate();
    const result = gate.decide(makeInput({ priorityScore: 2.0 }));
    expect(result.metadata.priorityLevel).toBe("low");
  });
});
