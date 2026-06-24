import { SummaryResult } from "./types.js";
export function extractSummary(sessionContext: string): SummaryResult {
  const goal = (sessionContext.match(/(?:goal|objective|task)[:\s]+([^\n]{10,200})/i) || [,"Unknown"])[1].trim();
  const matches = [...sessionContext.matchAll(/(?:decision|decided|chose)[:\s]+(.+)/gi)];
  const key_decisions = matches.map(m => ({ decision: m[1].trim(), rationale: "", outcome: "" }));
  const errMatches = [...sessionContext.matchAll(/(?:error|bug|issue|fail|exception)[:\s]+([^\n]{5,200})/gi)];
  const errors = errMatches.map(m => ({ error: m[1].trim(), root_cause: "", fix: "" }));
  const lMatches = [...sessionContext.matchAll(/(?:lesson|learned|takeaway|insight)[:\s]+([^\n]{5,200})/gi)];
  const lessons = lMatches.map(m => m[1].trim());
  return { goal, key_decisions, errors, lessons };
}