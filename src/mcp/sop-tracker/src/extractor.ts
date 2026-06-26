import { randomUUID } from "crypto";

/** A single step in a trajectory: (state, action, reward, next_state) */
export interface TrajectoryStep {
  stepIndex: number;
  state: string;       // Task state description
  action: string;      // Action taken
  reward: number;      // 0 or 1 (success/failure at this step)
  nextState: string;   // Resulting state
}

/** A full trajectory = ordered sequence of steps */
export interface SkillTrajectory {
  id: string;
  steps: TrajectoryStep[];
  totalReward: number;
  successRate: number;
  context: string;     // Tags, preconditions etc.
}

/** Extracted Skill-MDP — reusable skill pattern */
export interface SkillMDP {
  id: string;
  triggerPattern: string;
  steps: string;       // JSON array of step descriptions
  preconditions: string;
  score: number;       // Non-parametric PPO score
  confidence: number;  // How reliable this skill is
  trajectoryCount: number;
}

/**
 * Extract Skill-MDPs from one or more trajectories.
 *
 * Algorithm:
 * 1. Filter trajectories with successRate >= MIN_SUCCESS (0.5)
 * 2. For each successful trajectory, extract trigger pattern from first step's state
 * 3. Aggregate duplicate patterns (same trigger → average scores)
 * 4. Compute Non-Parametric PPO score:
 *    score = avg(successRate × trajectoryCount / maxTrajectories)
 * 5. Return deduplicated Skill-MDP list sorted by score desc
 */
export interface SkillExtractorConfig {
  minSuccessRate: number;      // default 0.5
  minTrajectories: number;     // default 1
}

export const DEFAULT_EXTRACTOR_CONFIG: SkillExtractorConfig = {
  minSuccessRate: 0.5,
  minTrajectories: 1,
};

export class SkillExtractor {
  private config: SkillExtractorConfig;

  constructor(config?: Partial<SkillExtractorConfig>) {
    this.config = { ...DEFAULT_EXTRACTOR_CONFIG, ...config };
  }

  /** Extract Skill-MDPs from raw trajectories. Pure function, no DB. */
  extract(trajectories: SkillTrajectory[]): SkillMDP[] {
    const validTrajs = trajectories.filter(
      (t) => t.successRate >= this.config.minSuccessRate
    );

    if (validTrajs.length < this.config.minTrajectories) return [];

    // Group by trigger pattern (extracted from first step's state)
    const groups = new Map<string, SkillTrajectory[]>();
    for (const traj of validTrajs) {
      const pattern = this.extractTriggerPattern(traj);
      if (!groups.has(pattern)) groups.set(pattern, []);
      groups.get(pattern)!.push(traj);
    }

    const skills: SkillMDP[] = [];
    const maxCount = Math.max(...Array.from(groups.values()).map(g => g.length), 1);

    for (const [triggerPattern, group] of groups) {
      const avgSuccessRate = group.reduce((s, t) => s + t.successRate, 0) / group.length;
      const score = avgSuccessRate * (group.length / maxCount);

      // Merge steps from all trajectories in the group
      const mergedSteps = this.mergeSteps(group);
      const preconditions = this.mergePreconditions(group);

      skills.push({
        id: randomUUID(),
        triggerPattern,
        steps: JSON.stringify(mergedSteps),
        preconditions,
        score: Math.round(score * 100) / 100,
        confidence: Math.round((avgSuccessRate * group.length / (group.length + 1)) * 100) / 100,
        trajectoryCount: group.length,
      });
    }

    skills.sort((a, b) => b.score - a.score);
    return skills;
  }

  /** Extract trigger pattern from first step's state description */
  private extractTriggerPattern(trajectory: SkillTrajectory): string {
    if (trajectory.steps.length === 0) return "unknown";
    const firstState = trajectory.steps[0].state.toLowerCase();
    // Take first 3 meaningful words as trigger
    const words = firstState.split(/\W+/).filter(w => w.length > 2);
    return words.slice(0, 3).join(" ") || firstState.slice(0, 40);
  }

  /** Merge steps from multiple trajectories of the same pattern */
  private mergeSteps(trajectories: SkillTrajectory[]): string[] {
    // Pick the longest trajectory's steps as the canonical version
    const longest = trajectories.reduce((a, b) =>
      a.steps.length > b.steps.length ? a : b
    );
    return longest.steps.map(s => s.action);
  }

  /** Merge preconditions from all trajectories */
  private mergePreconditions(trajectories: SkillTrajectory[]): string {
    const precons = new Set<string>();
    for (const t of trajectories) {
      if (t.context) {
        t.context.split(/\W+/).filter(Boolean).forEach(w => precons.add(w));
      }
    }
    return Array.from(precons).slice(0, 10).join(" ");
  }
}

/**
 * Non-Parametric PPO Gate — scores skills by their empirical success,
 * without training a parametric value function.
 *
 * score = Σ(reward_i) / N × sqrt(N / (N + 1))
 *
 * where reward_i = 1 for success, 0 for failure.
 * The sqrt(N/(N+1)) term is a Bayesian shrinkage factor that
 * down-weights skills with few observations.
 */

export interface PPOScore {
  skillId: string;
  triggerPattern: string;
  rawScore: number;       // average empirical reward
  shrunkenScore: number;  // after Bayesian shrinkage
  confidence: number;     // 0..1, based on observation count
  observations: number;
  lastUsed: string | null;
}

export interface ScoreCacheEntry {
  successRate: number;
  count: number;
  lastUpdated: string;
}

export class NonParametricPPO {
  private scoreCache: Map<string, ScoreCacheEntry> = new Map();

  /** Update score from a single outcome observation */
  update(skillId: string, triggerPattern: string, success: boolean): void {
    const existing = this.scoreCache.get(skillId) || { successRate: 0, count: 0, lastUpdated: "" };
    const newCount = existing.count + 1;
    const newRate = (existing.successRate * existing.count + (success ? 1 : 0)) / newCount;
    this.scoreCache.set(skillId, {
      successRate: newRate,
      count: newCount,
      lastUpdated: new Date().toISOString(),
    });
  }

  /** Get PPO score for a skill */
  getScore(skillId: string, triggerPattern: string): PPOScore {
    const entry = this.scoreCache.get(skillId);
    if (!entry || entry.count === 0) {
      return {
        skillId,
        triggerPattern,
        rawScore: 0,
        shrunkenScore: 0,
        confidence: 0,
        observations: 0,
        lastUsed: null,
      };
    }
    const n = entry.count;
    const shrinkage = Math.sqrt(n / (n + 1));
    return {
      skillId,
      triggerPattern,
      rawScore: entry.successRate,
      shrunkenScore: entry.successRate * shrinkage,
      confidence: shrinkage,
      observations: n,
      lastUsed: entry.lastUpdated,
    };
  }

  /** Get all cached scores, sorted by shrunken score descending */
  getAllScores(): PPOScore[] {
    const scores: PPOScore[] = [];
    for (const [skillId, entry] of this.scoreCache) {
      scores.push({
        skillId,
        triggerPattern: "",
        rawScore: entry.successRate,
        shrunkenScore: entry.successRate * Math.sqrt(entry.count / (entry.count + 1)),
        confidence: Math.sqrt(entry.count / (entry.count + 1)),
        observations: entry.count,
        lastUsed: entry.lastUpdated,
      });
    }
    scores.sort((a, b) => b.shrunkenScore - a.shrunkenScore);
    return scores;
  }

  /** Prune scores below threshold */
  prune(minObservations: number = 2, minScore: number = 0.3): number {
    let removed = 0;
    for (const [skillId, entry] of this.scoreCache) {
      if (entry.count < minObservations || entry.successRate < minScore) {
        this.scoreCache.delete(skillId);
        removed++;
      }
    }
    return removed;
  }

  /** Serialize cache for persistence */
  toJSON(): Record<string, ScoreCacheEntry> {
    const obj: Record<string, ScoreCacheEntry> = {};
    for (const [key, val] of this.scoreCache) {
      obj[key] = val;
    }
    return obj;
  }

  /** Load cache from serialized data */
  fromJSON(data: Record<string, ScoreCacheEntry>): void {
    for (const [key, val] of Object.entries(data)) {
      this.scoreCache.set(key, val);
    }
  }
}
