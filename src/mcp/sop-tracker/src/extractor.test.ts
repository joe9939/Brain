import { describe, test, expect } from "bun:test";
import {
  SkillExtractor,
  NonParametricPPO,
  type SkillTrajectory,
  type TrajectoryStep,
  type SkillMDP,
} from "./extractor.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(overrides?: Partial<TrajectoryStep>): TrajectoryStep {
  return {
    stepIndex: 0,
    state: "example state for testing",
    action: "do something",
    reward: 1,
    nextState: "result state",
    ...overrides,
  };
}

function makeTrajectory(
  overrides?: Partial<SkillTrajectory>,
): SkillTrajectory {
  return {
    id: "traj-1",
    steps: [makeStep()],
    totalReward: 1,
    successRate: 1.0,
    context: "test deploy",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group 1: SkillExtractor.extract()
// ---------------------------------------------------------------------------

describe("SkillExtractor.extract()", () => {
  test("empty trajectories returns empty array", () => {
    const extractor = new SkillExtractor();
    expect(extractor.extract([])).toEqual([]);
  });

  test("all trajectories below minSuccessRate returns empty array", () => {
    const extractor = new SkillExtractor();
    const trajs = [
      makeTrajectory({ id: "t1", successRate: 0.3 }),
      makeTrajectory({ id: "t2", successRate: 0.0 }),
    ];
    expect(extractor.extract(trajs)).toEqual([]);
  });

  test("single successful trajectory returns 1 skill with correct structure", () => {
    const extractor = new SkillExtractor();
    const trajs = [makeTrajectory()];
    const skills = extractor.extract(trajs);

    expect(skills).toHaveLength(1);

    const skill = skills[0];
    expect(skill).toHaveProperty("id");
    expect(typeof skill.id).toBe("string");
    expect(skill.triggerPattern).toBe("example state for");
    expect(skill.steps).toBe(JSON.stringify(["do something"]));
    expect(skill.preconditions).toBe("test deploy");
    expect(skill.score).toBe(1.0);
    // confidence = round(1.0 * 1 / 2 * 100) / 100 = 0.50
    expect(skill.confidence).toBe(0.5);
    expect(skill.trajectoryCount).toBe(1);
  });

  test("multiple trajectories with same trigger merged into 1 skill", () => {
    const extractor = new SkillExtractor();
    const trajs = [
      makeTrajectory({ id: "t1" }),
      makeTrajectory({ id: "t2" }),
    ];
    const skills = extractor.extract(trajs);

    expect(skills).toHaveLength(1);
    expect(skills[0].trajectoryCount).toBe(2);

    // Only one group → maxCount = 2
    // score = 1.0 * (2 / 2) = 1.0
    expect(skills[0].score).toBe(1.0);

    // confidence = round(1.0 * 2 / 3 * 100) / 100 = 0.67
    expect(skills[0].confidence).toBe(0.67);
  });

  test("multiple trajectories with different triggers returns sorted skills", () => {
    const extractor = new SkillExtractor();
    const trajs = [
      makeTrajectory({
        id: "t1",
        steps: [makeStep({ state: "alpha deployment process" })],
        successRate: 1.0,
      }),
      makeTrajectory({
        id: "t2",
        steps: [makeStep({ state: "beta integration test" })],
        successRate: 0.6,
      }),
    ];
    const skills = extractor.extract(trajs);

    expect(skills).toHaveLength(2);
    expect(skills[0].score).toBeGreaterThan(skills[1].score);
    expect(skills[0].triggerPattern).toBe("alpha deployment process");
    expect(skills[1].triggerPattern).toBe("beta integration test");
    // First skill gets score = 1.0 * (1/1) = 1.0
    expect(skills[0].score).toBe(1.0);
    // Second skill gets score = 0.6 * (1/1) = 0.6
    expect(skills[1].score).toBe(0.6);
  });

  test("custom config with minSuccessRate=0.9 filters more aggressively", () => {
    const strict = new SkillExtractor({ minSuccessRate: 0.9 });
    const trajs = [
      makeTrajectory({ id: "t1", successRate: 0.7 }),
    ];
    expect(strict.extract(trajs)).toEqual([]);

    // Default config with same trajectory should NOT filter it
    const lenient = new SkillExtractor();
    expect(lenient.extract(trajs)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Group 2: NonParametricPPO
// ---------------------------------------------------------------------------

describe("NonParametricPPO", () => {
  test("new skill returns zero score for all fields", () => {
    const ppo = new NonParametricPPO();
    const score = ppo.getScore("skill-1", "deploy");

    expect(score.skillId).toBe("skill-1");
    expect(score.triggerPattern).toBe("deploy");
    expect(score.rawScore).toBe(0);
    expect(score.shrunkenScore).toBe(0);
    expect(score.confidence).toBe(0);
    expect(score.observations).toBe(0);
    expect(score.lastUsed).toBeNull();
  });

  test("single success update produces correct computed values", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-1", "deploy", true);
    const score = ppo.getScore("skill-1", "deploy");

    expect(score.rawScore).toBe(1.0);
    // N=1 → shrinkage = sqrt(1/2) ≈ 0.7071
    expect(score.shrunkenScore).toBeCloseTo(0.707, 3);
    expect(score.confidence).toBeCloseTo(0.707, 3);
    expect(score.observations).toBe(1);
    expect(score.lastUsed).not.toBeNull();
  });

  test("multiple successes approach score of 1.0", () => {
    const ppo = new NonParametricPPO();
    for (let i = 0; i < 10; i++) {
      ppo.update("skill-1", "deploy", true);
    }
    const score = ppo.getScore("skill-1", "deploy");

    expect(score.rawScore).toBe(1.0);
    // N=10 → shrinkage = sqrt(10/11) ≈ 0.9535
    expect(score.shrunkenScore).toBeGreaterThan(0.95);
    // Should still be < 1.0 due to shrinkage
    expect(score.shrunkenScore).toBeLessThan(1.0);
    expect(score.observations).toBe(10);
  });

  test("mixed success/failure reflects correct ratio", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", false);
    const score = ppo.getScore("skill-1", "deploy");

    // 3 successes / 4 = 0.75
    expect(score.rawScore).toBeCloseTo(0.75, 3);
    // N=4 → shrinkage = sqrt(4/5) ≈ 0.8944, shrunken = 0.75 * 0.8944 ≈ 0.6708
    expect(score.shrunkenScore).toBeCloseTo(0.671, 3);
    expect(score.observations).toBe(4);
  });

  test("getAllScores returns sorted by shrunkenScore descending", () => {
    const ppo = new NonParametricPPO();
    ppo.update("low", "low skill", false); // N=1, rawScore=0  → shrunken=0
    ppo.update("low", "low skill", true);  // N=2, rawScore=0.5
    ppo.update("mid", "mid skill", true);  // N=1, rawScore=1
    ppo.update("mid", "mid skill", true);  // N=2, rawScore=1
    ppo.update("high", "high skill", true); // N=1
    ppo.update("high", "high skill", true); // N=2
    ppo.update("high", "high skill", true); // N=3, rawScore=1

    const scores = ppo.getAllScores();
    expect(scores).toHaveLength(3);

    // Verify descending order
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].shrunkenScore).toBeGreaterThanOrEqual(
        scores[i].shrunkenScore,
      );
    }

    // High: N=3, shrinkage=sqrt(3/4)=0.866, shrunken=0.866 → highest
    expect(scores[0].skillId).toBe("high");
    // Mid: N=2, shrinkage=sqrt(2/3)=0.816, shrunken=0.816 → middle
    expect(scores[1].skillId).toBe("mid");
    // Low: N=2, rawScore=0.5, shrinkage=sqrt(2/3)=0.816, shrunken=0.5*0.816=0.408 → lowest
    expect(scores[2].skillId).toBe("low");

    // getAllScores sets triggerPattern to empty string
    expect(scores[0].triggerPattern).toBe("");
  });

  test("prune removes low-observation entries", () => {
    const ppo = new NonParametricPPO();
    // "good": 2 observations, successRate=1.0 — kept by prune(2, 0.3)
    ppo.update("good", "good skill", true);
    ppo.update("good", "good skill", true);
    // "bad": 1 observation, successRate=0.0 — removed by prune(2, 0.3)
    ppo.update("bad", "bad skill", false);

    const removed = ppo.prune(2, 0.3);
    expect(removed).toBe(1);

    const remaining = ppo.getAllScores();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].skillId).toBe("good");
  });

  test("toJSON/fromJSON roundtrip preserves scores", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-2", "build", false);

    const json = ppo.toJSON();

    const ppo2 = new NonParametricPPO();
    ppo2.fromJSON(json);

    const s1 = ppo2.getScore("skill-1", "deploy");
    expect(s1.rawScore).toBe(1.0);
    expect(s1.observations).toBe(2);

    const s2 = ppo2.getScore("skill-2", "build");
    expect(s2.rawScore).toBe(0.0);
    expect(s2.observations).toBe(1);
  });

  test("multiple different skills tracked independently", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-1", "deploy", true);
    ppo.update("skill-2", "build", false);

    const s1 = ppo.getScore("skill-1", "deploy");
    const s2 = ppo.getScore("skill-2", "build");

    expect(s1.rawScore).toBe(1.0);
    expect(s2.rawScore).toBe(0.0);
    expect(s1.observations).toBe(3);
    expect(s2.observations).toBe(1);
    expect(s1.shrunkenScore).toBeGreaterThan(s2.shrunkenScore);
  });
});

// ---------------------------------------------------------------------------
// Group 3: Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  test("all-false updates produce zero rawScore and shrunkenScore", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-1", "deploy", false);
    ppo.update("skill-1", "deploy", false);
    ppo.update("skill-1", "deploy", false);
    const score = ppo.getScore("skill-1", "deploy");

    expect(score.rawScore).toBe(0);
    expect(score.shrunkenScore).toBe(0);
    // N=3, confidence = sqrt(3/4) = 0.866 (confidence is independent of rawScore)
    expect(score.confidence).toBeCloseTo(0.866, 3);
    expect(score.observations).toBe(3);
  });

  test("getAllScores on empty cache returns empty array", () => {
    const ppo = new NonParametricPPO();
    expect(ppo.getAllScores()).toEqual([]);
  });

  test("prune with no low-scoring entries removes 0", () => {
    const ppo = new NonParametricPPO();
    ppo.update("a", "good skill", true);
    ppo.update("a", "good skill", true);
    ppo.update("b", "also good", true);
    ppo.update("b", "also good", true);
    ppo.update("b", "also good", true);

    const removed = ppo.prune(2, 0.3);
    expect(removed).toBe(0);

    const remaining = ppo.getAllScores();
    expect(remaining).toHaveLength(2);
  });
});
