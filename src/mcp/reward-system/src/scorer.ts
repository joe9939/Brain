import { ScoreInput, ScoreOutput } from "./types.js";

const BASE_SCORES: Record<string, number> = { read: 7, edit: 5.5, write: 5, bash: 4, delete: 1, task: 5, question: 8 };
const SENSITIVE_TARGETS = [/auth\./, /\.env/, /secret/, /password/, /token/, /key\.pem/];
const TEST_TARGETS = [/test\./, /\.test\./, /\.spec\./];

// ─── UCB1 Exploration Bonus ───
const actionCounts = new Map<string, number>();
const totalActions = { count: 0 };

export function recordAction(actionType: string): void {
  actionCounts.set(actionType, (actionCounts.get(actionType) || 0) + 1);
  totalActions.count++;
}

function computeUCBBonus(actionType: string, cap: number = 3): number {
  const n = actionCounts.get(actionType) || 0;
  const total = totalActions.count || 1;
  if (n < 5) return cap; // initial exploration: max bonus for unseen
  const bonus = Math.sqrt(2 * Math.log(total) / n);
  return Math.min(bonus, cap);
}

// ─── TD Learning ───
const stateValues = new Map<string, number>();
const LR = 0.1;
const GAMMA = 0.9;

function computeStateHash(actionType: string, target: string): string {
  const targetType = SENSITIVE_TARGETS.some(r => r.test(target)) ? "sensitive"
    : TEST_TARGETS.some(r => r.test(target)) ? "test"
    : "normal";
  return `${actionType}:${targetType}`;
}

export function tdUpdate(stateHash: string, reward: number, nextStateHash?: string): void {
  const current = stateValues.get(stateHash) || 5;
  let tdTarget = reward;
  if (nextStateHash) {
    tdTarget += GAMMA * (stateValues.get(nextStateHash) || 5);
  }
  const updated = current + LR * (tdTarget - current);
  stateValues.set(stateHash, Math.max(0, Math.min(10, updated)));
}

// ─── Hierarchical Scoring ───
const stepScores = new Map<string, { scores: number[]; level: string }>();

export function recordHierarchical(actionId: string, score: number, level: string): void {
  if (level === 'atomic') {
    stepScores.set(actionId, { scores: [score], level: 'atomic' });
  } else if (level === 'step') {
    // aggregate: step score = average of atomic scores with this step prefix
    const prefix = actionId.split(':')[0];
    const related = Array.from(stepScores.entries())
      .filter(([k, v]) => k.startsWith(prefix) && v.level === 'atomic');
    const allScores = [...related.flatMap(([_, v]) => v.scores), score];
    stepScores.set(actionId, { scores: allScores, level: 'step' });
  } else if (level === 'task') {
    const all = Array.from(stepScores.values());
    const allScores = all.flatMap(v => v.scores);
    allScores.push(score);
    stepScores.set(actionId, { scores: allScores, level: 'task' });
  }
}

export function getHierarchicalScore(actionIds: string[]): {
  scores: Array<{ action_id: string; score: number; level: string }>;
  aggregate: { step_avg: number; task_avg: number };
} {
  const scores = actionIds.map(id => {
    const record = stepScores.get(id);
    const avg = record ? record.scores.reduce((a, b) => a + b, 0) / record.scores.length : 0;
    return { action_id: id, score: Math.round(avg * 10) / 10, level: record?.level || 'unknown' };
  });

  const steps = scores.filter(s => s.level === 'step').map(s => s.score);
  const tasks = scores.filter(s => s.level === 'task').map(s => s.score);

  return {
    scores,
    aggregate: {
      step_avg: steps.length > 0 ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length * 10) / 10 : 0,
      task_avg: tasks.length > 0 ? Math.round(tasks.reduce((a, b) => a + b, 0) / tasks.length * 10) / 10 : 0,
    },
  };
}

// ─── Main Scorer ───

export function scoreAction(input: ScoreInput, alpha: number = 0.7, explorationWeight: number = 0.3): ScoreOutput {
  const extrinsic = computeExtrinsic(input);
  const intrinsic = computeIntrinsic(input);

  // UCB1 bonus
  const ucbBonus = computeUCBBonus(input.action_type) * explorationWeight;
  recordAction(input.action_type);

  // TD state value
  const stateHash = computeStateHash(input.action_type, input.target);
  const tdValue = stateValues.get(stateHash) || 5;

  const total = Math.round((alpha * (extrinsic.score + ucbBonus) + (1 - alpha) * intrinsic.score) * 10) / 10;
  const finalScore = Math.max(0, Math.min(10, total));

  let risk_level: "low" | "medium" | "high";
  if (finalScore < 3) risk_level = "high";
  else if (finalScore < 6) risk_level = "medium";
  else risk_level = "low";

  return {
    total_score: finalScore,
    extrinsic,
    intrinsic,
    risk_level,
    ucb_bonus: Math.round(ucbBonus * 10) / 10,
    td_value: Math.round(tdValue * 10) / 10,
    hierarchical: undefined,
    explanation: `ext=${extrinsic.score.toFixed(1)}(${extrinsic.breakdown}) int=${intrinsic.score.toFixed(1)}(${intrinsic.breakdown}) ucb=+${ucbBonus.toFixed(1)} td=${tdValue.toFixed(1)} α=${alpha} total=${finalScore.toFixed(1)}`,
  };
}

function computeExtrinsic(input: ScoreInput): { score: number; breakdown: string } {
  let score = BASE_SCORES[input.action_type] || 5;
  const reasons: string[] = [`base=${score}`];
  for (const pattern of SENSITIVE_TARGETS) {
    if (pattern.test(input.target)) { score -= 2; reasons.push("sensitive_target(-2)"); break; }
  }
  for (const pattern of TEST_TARGETS) {
    if (pattern.test(input.target)) { score += 1.5; reasons.push("test_file(+1.5)"); break; }
  }
  if (input.context && input.context.length > 10) { score += 0.5; reasons.push("context(+0.5)"); }
  return { score: Math.max(0, Math.min(10, score)), breakdown: reasons.join(" ") };
}

function computeIntrinsic(input: ScoreInput): { score: number; breakdown: string } {
  let score = 0;
  const reasons: string[] = [];
  if (input.action_type === "read" && !input.context) { score += 1; reasons.push("curiosity(+1)"); }
  if (input.action_type === "edit" || input.action_type === "write") { score += 1.5; reasons.push("competence(+1.5)"); }
  if (input.action_type === "read" || input.action_type === "question") { score += 1; reasons.push("infogain(+1)"); }
  return { score: Math.min(4, score), breakdown: reasons.join(" ") || "baseline" };
}

export const scorer = { scoreAction, BASE_SCORES, SENSITIVE_TARGETS, TEST_TARGETS, tdUpdate, recordHierarchical, getHierarchicalScore };
