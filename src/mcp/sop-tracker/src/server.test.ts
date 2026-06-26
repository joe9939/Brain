import { describe, test, expect } from "bun:test";
import { SkillExtractor, NonParametricPPO } from "./extractor.js";

// ---------------------------------------------------------------------------
// Integration tests for sop-tracker MCP tool logic.
// Tests exercise the same code paths the tool handlers use without
// spinning up an MCP server transport.
//   - sop_extract_skill: SkillExtractor.extract()
//   - sop_ppo_score:     NonParametricPPO.update() + getScore()
//   - sop_ppo_scores:    NonParametricPPO.getAllScores()
// ---------------------------------------------------------------------------

describe("sop_extract_skill tool logic (via SkillExtractor)", () => {
  test("extracts skill with default parameters", () => {
    // Create trajectories: 2 successful, 1 failed
    const trajs = [
      {
        id: "t1",
        steps: [
          {
            stepIndex: 0,
            state: "build project",
            action: "run build",
            reward: 1,
            nextState: "built",
          },
        ],
        totalReward: 1,
        successRate: 1.0,
        context: "build",
      },
      {
        id: "t2",
        steps: [
          {
            stepIndex: 0,
            state: "build project",
            action: "run build",
            reward: 1,
            nextState: "built",
          },
        ],
        totalReward: 1,
        successRate: 0.0,
        context: "build",
      },
    ];
    const extractor = new SkillExtractor({ minSuccessRate: 0.3 });
    const skills = extractor.extract(trajs);
    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0].triggerPattern).toBeTruthy();
  });

  test("extracts skill with mixed trajectory success rates", () => {
    const trajs = [
      {
        id: "t1",
        steps: [
          {
            stepIndex: 0,
            state: "deploy application",
            action: "run deploy",
            reward: 1,
            nextState: "deployed",
          },
        ],
        totalReward: 1,
        successRate: 1.0,
        context: "deploy prod",
      },
      {
        id: "t2",
        steps: [
          {
            stepIndex: 0,
            state: "deploy application",
            action: "run deploy",
            reward: 1,
            nextState: "deployed",
          },
        ],
        totalReward: 0,
        successRate: 0.6,
        context: "deploy staging",
      },
    ];
    const extractor = new SkillExtractor({ minSuccessRate: 0.5 });
    const skills = extractor.extract(trajs);
    // Both are at or above 0.5, so both qualify
    expect(skills).toHaveLength(1); // same trigger pattern → merged
    expect(skills[0].trajectoryCount).toBe(2);
    // avg success rate = (1.0 + 0.6) / 2 = 0.8, group count = 2, maxCount = 2
    // score = 0.8 * (2/2) = 0.8
    expect(skills[0].score).toBe(0.8);
  });

  test("sop_extract_skill with custom min_success_rate filters low performers", () => {
    const trajs = [
      {
        id: "t1",
        steps: [
          {
            stepIndex: 0,
            state: "test feature",
            action: "run tests",
            reward: 1,
            nextState: "tested",
          },
        ],
        totalReward: 1,
        successRate: 0.4,
        context: "testing",
      },
    ];
    // Default minSuccessRate = 0.5 — this trajectory is excluded
    const defaultExtractor = new SkillExtractor();
    expect(defaultExtractor.extract(trajs)).toEqual([]);

    // Relaxed threshold includes it
    const relaxedExtractor = new SkillExtractor({ minSuccessRate: 0.3 });
    const skills = relaxedExtractor.extract(trajs);
    expect(skills).toHaveLength(1);
    // score = successRate (0.4) * groupCount/maxCount (1/1) = 0.4
    expect(skills[0].score).toBe(0.4);
  });
});

describe("sop_ppo_score tool logic (via NonParametricPPO)", () => {
  test("update and getScore produces expected shrunkenScore", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-deploy", "deploy app", true);
    ppo.update("skill-deploy", "deploy app", true);
    const score = ppo.getScore("skill-deploy", "deploy app");
    // 2 successes / 2 = 1.0 raw, shrinkage = sqrt(2/3) ≈ 0.816
    expect(score.rawScore).toBe(1.0);
    expect(score.shrunkenScore).toBeCloseTo(0.816, 2);
    expect(score.observations).toBe(2);
  });

  test("sop_ppo_score with failure reduces score", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-test", "run tests", true);
    ppo.update("skill-test", "run tests", false);
    const score = ppo.getScore("skill-test", "run tests");
    expect(score.rawScore).toBe(0.5);
    expect(score.observations).toBe(2);
  });

  test("multiple skills tracked independently", () => {
    const ppo = new NonParametricPPO();
    ppo.update("deploy", "deploy app", true);
    ppo.update("deploy", "deploy app", true);
    ppo.update("deploy", "deploy app", true);
    ppo.update("build", "build app", false);
    const deployScore = ppo.getScore("deploy", "deploy app");
    const buildScore = ppo.getScore("build", "build app");
    expect(deployScore.rawScore).toBe(1.0);
    expect(buildScore.rawScore).toBe(0.0);
    expect(deployScore.shrunkenScore).toBeGreaterThan(buildScore.shrunkenScore);
  });

  test("single observation uses correct shrinkage", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-single", "single task", true);
    const score = ppo.getScore("skill-single", "single task");
    // N=1 → shrinkage = sqrt(1/2) ≈ 0.707
    expect(score.rawScore).toBe(1.0);
    expect(score.shrunkenScore).toBeCloseTo(0.707, 3);
    expect(score.observations).toBe(1);
  });
});

describe("sop_ppo_scores tool logic (via NonParametricPPO.getAllScores)", () => {
  test("getAllScores returns all entries", () => {
    const ppo = new NonParametricPPO();
    ppo.update("good", "good skill", true);
    ppo.update("good", "good skill", true);
    ppo.update("good", "good skill", true);
    ppo.update("new", "new skill", true);

    const scores = ppo.getAllScores();
    expect(scores).toHaveLength(2);
  });

  test("getAllScores can be filtered by min_observations", () => {
    const ppo = new NonParametricPPO();
    ppo.update("good", "good skill", true);
    ppo.update("good", "good skill", true);
    ppo.update("good", "good skill", true);
    ppo.update("new", "new skill", true);

    const scores = ppo.getAllScores();
    const filtered = scores.filter((s) => s.observations >= 2);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].skillId).toBe("good");
  });

  test("getAllScores results vary by success rate", () => {
    const ppo = new NonParametricPPO();
    ppo.update("high", "high skill", true);
    ppo.update("high", "high skill", true);
    ppo.update("high", "high skill", true);
    ppo.update("low", "low skill", false);

    const scores = ppo.getAllScores();
    const highScore = scores.find((s) => s.skillId === "high")!;
    const lowScore = scores.find((s) => s.skillId === "low")!;

    // high: 3 obs, 1.0 raw → shrunken = sqrt(3/4) = 0.866
    expect(highScore.shrunkenScore).toBeGreaterThan(0.8);
    // low: 1 obs, 0.0 raw → shrunken = 0
    expect(lowScore.shrunkenScore).toBe(0);
  });

  test("getAllScores empty cache returns empty array", () => {
    const ppo = new NonParametricPPO();
    expect(ppo.getAllScores()).toEqual([]);
  });

  test("getAllScores sets triggerPattern to empty string (tool contract)", () => {
    const ppo = new NonParametricPPO();
    ppo.update("skill-a", "pattern-a", true);
    const scores = ppo.getAllScores();
    // getAllScores does not store/return triggerPattern — it's empty
    expect(scores[0].triggerPattern).toBe("");
  });
});
