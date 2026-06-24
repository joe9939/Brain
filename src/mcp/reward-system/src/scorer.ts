import { ScoreInput, ScoreOutput } from "./types.js";

const BASE_SCORES: Record<string, number> = { read: 7, edit: 5.5, write: 5, bash: 4, delete: 1, task: 5, question: 8, };
const SENSITIVE_TARGETS = [/auth\./, /\.env/, /secret/, /password/, /token/, /key\.pem/];
const TEST_TARGETS = [/test\./, /\.test\./, /\.spec\./];

export function scoreAction(input: ScoreInput, alpha: number = 0.7): ScoreOutput {
  const extrinsic = computeExtrinsic(input);
  const intrinsic = computeIntrinsic(input);
  const total = Math.round((alpha * extrinsic.score + (1 - alpha) * intrinsic.score) * 10) / 10;
  
  let risk_level: "low"|"medium"|"high";
  if (total < 3) risk_level = "high";
  else if (total < 6) risk_level = "medium";
  else risk_level = "low";
  
  return {
    total_score: Math.max(0, Math.min(10, total)),
    extrinsic,
    intrinsic,
    risk_level,
    explanation: `extrinsic=${extrinsic.score.toFixed(1)}(${extrinsic.breakdown}) intrinsic=${intrinsic.score.toFixed(1)}(${intrinsic.breakdown}) α=${alpha} total=${total.toFixed(1)}`,
  };
}

function computeExtrinsic(input: ScoreInput): {score:number;breakdown:string} {
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

function computeIntrinsic(input: ScoreInput): {score:number;breakdown:string} {
  let score = 0;
  const reasons: string[] = [];
  
  // Curiosity: action that explores
  if (input.action_type === "read" && !input.context) { score += 1; reasons.push("curiosity(+1)"); }
  
  // Competence: creative actions
  if (input.action_type === "edit" || input.action_type === "write") { score += 1.5; reasons.push("competence(+1.5)"); }
  
  // Information gain: knowledge acquisition
  if (input.action_type === "read" || input.action_type === "question") { score += 1; reasons.push("infogain(+1)"); }
  
  return { score: Math.min(4, score), breakdown: reasons.join(" ") || "baseline" };
}

export const scorer = { scoreAction, BASE_SCORES, SENSITIVE_TARGETS, TEST_TARGETS };