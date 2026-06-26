/**
 * μ (mu) head — Working Memory Gate Controller
 *
 * Inspired by MemCtrl (arXiv 2601.20831) and the dorsolateral prefrontal
 * cortex (DLPFC) which governs working memory gating.
 *
 * Three gates:
 *   RETAIN  — Keep the memory as-is (high importance or recent)
 *   UPDATE  — Modify with new information (conflicting but important)
 *   DISCARD — Remove from working memory (low importance, old, unused)
 */

export type MuGateDecision = "RETAIN" | "UPDATE" | "DISCARD";

export interface MuGateInput {
  id: string;
  priorityScore: number;   // 0-10 scale
  status: string;
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  accessCount?: number;
}

export interface MuGateOutput {
  decision: MuGateDecision;
  reason: string;
  confidence: number;      // 0-1
  metadata: {
    ageHours: number;
    hoursSinceUpdate: number;
    priorityLevel: string;  // "high" | "medium" | "low"
  };
}

export interface MuGateConfig {
  retainImportanceThreshold: number;   // default 7.0 (out of 10)
  retainRecentHours: number;           // default 1 (hour)
  discardOldHours: number;             // default 24 (hours)
  discardLowPriority: number;          // default 3.0 (out of 10)
  discardLowAccess: number;            // default 3 (times)
  updateOverlapThreshold: number;      // default 0.5 (similarity ratio)
}

export const DEFAULT_MU_CONFIG: MuGateConfig = {
  retainImportanceThreshold: 7.0,
  retainRecentHours: 1,
  discardOldHours: 24,
  discardLowPriority: 3.0,
  discardLowAccess: 3,
  updateOverlapThreshold: 0.5,
};

export class MuGate {
  private config: MuGateConfig;

  constructor(config?: Partial<MuGateConfig>) {
    this.config = { ...DEFAULT_MU_CONFIG, ...config };
  }

  /** Decide action for a working memory entry */
  decide(input: MuGateInput, context?: string): MuGateOutput {
    const ageHours = this.hoursSince(new Date(input.createdAt));
    const hoursSinceUpdate = this.hoursSince(new Date(input.updatedAt));
    const accessCount = input.accessCount ?? 0;

    const priorityLevel = input.priorityScore >= this.config.retainImportanceThreshold
      ? "high"
      : input.priorityScore >= this.config.discardLowPriority
        ? "medium"
        : "low";

    // RETAIN: recent or high importance
    if (ageHours < this.config.retainRecentHours) {
      return {
        decision: "RETAIN",
        reason: `Memory is recent (${ageHours.toFixed(1)}h < ${this.config.retainRecentHours}h threshold)`,
        confidence: 0.9,
        metadata: { ageHours, hoursSinceUpdate, priorityLevel },
      };
    }

    if (input.priorityScore >= this.config.retainImportanceThreshold) {
      return {
        decision: "RETAIN",
        reason: `High importance score (${input.priorityScore} >= ${this.config.retainImportanceThreshold})`,
        confidence: 0.85,
        metadata: { ageHours, hoursSinceUpdate, priorityLevel },
      };
    }

    // DISCARD: old AND low priority AND low access
    const isOld = ageHours >= this.config.discardOldHours;
    const isLowPriority = input.priorityScore < this.config.discardLowPriority;
    const isLowAccess = accessCount < this.config.discardLowAccess;

    if (isOld && isLowPriority && isLowAccess) {
      return {
        decision: "DISCARD",
        reason: `Old (${ageHours.toFixed(0)}h), low priority (${input.priorityScore}), low access (${accessCount})`,
        confidence: 0.8,
        metadata: { ageHours, hoursSinceUpdate, priorityLevel },
      };
    }

    // UPDATE: old but still active, or medium priority with low access
    if (ageHours >= this.config.discardOldHours && input.priorityScore >= this.config.discardLowPriority) {
      return {
        decision: "UPDATE",
        reason: `Old (${ageHours.toFixed(0)}h) but still relevant (priority ${input.priorityScore})`,
        confidence: 0.6,
        metadata: { ageHours, hoursSinceUpdate, priorityLevel },
      };
    }

    if (isLowPriority && !isLowAccess) {
      return {
        decision: "UPDATE",
        reason: `Low priority (${input.priorityScore}) but frequently accessed (${accessCount} times)`,
        confidence: 0.55,
        metadata: { ageHours, hoursSinceUpdate, priorityLevel },
      };
    }

    // Default: RETAIN (conservative — don't discard unless confident)
    return {
      decision: "RETAIN",
      reason: `No strong signal to update or discard (age ${ageHours.toFixed(1)}h, priority ${input.priorityScore})`,
      confidence: 0.5,
      metadata: { ageHours, hoursSinceUpdate, priorityLevel },
    };
  }

  /** Decide for multiple inputs, return sorted by confidence (RETAIN first, DISCARD last) */
  batchDecide(inputs: MuGateInput[], context?: string): MuGateOutput[] {
    const outputs = inputs.map(i => this.decide(i, context));
    const order = { RETAIN: 0, UPDATE: 1, DISCARD: 2 };
    outputs.sort((a, b) => order[a.decision] - order[b.decision] || b.confidence - a.confidence);
    return outputs;
  }

  private hoursSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }
}
