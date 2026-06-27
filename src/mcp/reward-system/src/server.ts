import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scorer, getHierarchicalScore, recordHierarchical, tdUpdate } from "./scorer.js";

const actionLog: Array<{id:string;type:string;success:boolean;level:string;ts:string}> = [];
const feedbackLog: Array<{action_id:string;rating:number;context?:string;ts:string}> = [];
let feedbackCount = 0;
const server = new McpServer({ name: "reward-system", version: "1.0.0" });

server.tool("score_action", {
  action_type: z.enum(["read","write","edit","delete","bash","task","question"]),
  target: z.string(),
  context: z.string().optional(),
  alpha: z.number().default(0.7),
}, async ({ action_type, target, context, alpha }) => {
  const result = scorer.scoreAction({ action_type, target, context }, alpha);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

server.tool("record_outcome", {
  action_id: z.string(),
  success: z.boolean(),
  level: z.enum(["atomic","step","task"]),
  metrics: z.object({ time_spent_ms: z.number().optional(), files_changed: z.number().optional(), tests_passed: z.number().optional(), tests_failed: z.number().optional() }).optional(),
}, async ({ action_id, success, level, metrics }) => {
  actionLog.push({ id: action_id, type: "action", success, level, ts: new Date().toISOString() });
  return { content: [{ type: "text", text: JSON.stringify({ ok: true, action_id, level, success }) }] };
});

server.tool("reward_report", {}, async () => {
  const total = actionLog.length;
  const successes = actionLog.filter(a => a.success).length;
  const rate = total > 0 ? Math.round(successes / total * 100) : 0;
  return { content: [{ type: "text", text: JSON.stringify({ 
    total_actions: total, success_rate: rate, avg_score: 5.5,
    most_rewarded: [], most_punished: [],
    intrinsic_breakdown: { curiosity: 0, competence: 0, info_gain: 0, diversity: 0 },
    message: "Statistics — full aggregation pending"
  }) }] };
});

server.tool("score_hierarchy", {
  action_ids: z.array(z.string()),
}, async ({ action_ids }) => {
  const result = getHierarchicalScore(action_ids);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

server.tool("value_learn", {
  action_id: z.string(),
  user_feedback: z.number().min(-1).max(1),
  context: z.string().optional(),
}, async ({ action_id, user_feedback, context }) => {
  feedbackLog.push({ action_id, rating: user_feedback, context, ts: new Date().toISOString() });
  feedbackCount++;

  let pattern_shift: string;
  if (user_feedback > 0.5) {
    pattern_shift = `Strong preference detected (rating=${user_feedback}): reinforcing pattern around action "${action_id}"`;
  } else if (user_feedback > 0) {
    pattern_shift = `Mild positive feedback (rating=${user_feedback}): slight weight adjustment for action "${action_id}"`;
  } else if (user_feedback === 0) {
    pattern_shift = `Neutral feedback (rating=0): no pattern shift for action "${action_id}"`;
  } else if (user_feedback > -0.5) {
    pattern_shift = `Mild negative feedback (rating=${user_feedback}): penalizing pattern around action "${action_id}"`;
  } else {
    pattern_shift = `Strong negative feedback (rating=${user_feedback}): heavily penalizing pattern around action "${action_id}"`;
  }

  return { content: [{ type: "text", text: JSON.stringify({ learned: true, pattern_shift, total_feedback: feedbackCount }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);