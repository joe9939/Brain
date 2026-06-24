import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scorer } from "./scorer.js";

const actionLog: Array<{id:string;type:string;success:boolean;level:string;ts:string}> = [];
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

const transport = new StdioServerTransport();
await server.connect(transport);