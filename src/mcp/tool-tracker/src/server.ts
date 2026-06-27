import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ToolTracker } from "./tracker.js";

const tracker = new ToolTracker();
const server = new McpServer({ name: "tool-tracker", version: "1.0.0" });

function ok(data: any) { return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }; }
function err(reason: string) { return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, reason }) }] }; }

server.tool("track_tool_use", {
  action_type: z.string(), target: z.string().default(""),
  success: z.boolean().default(true), duration_ms: z.number().default(0),
  context: z.string().default(""), task_description: z.string().default(""),
}, async ({ action_type, target, success, duration_ms, context, task_description }) => {
  try {
    tracker.track(action_type, target, success, duration_ms, context, task_description);
    return ok({ ok: true });
  } catch (e: any) { return err(e.message || "track failed"); }
});

server.tool("get_tool_stats", {
  tool_name: z.string().optional(), k: z.number().default(10),
}, async ({ tool_name, k }) => {
  try {
    const stats = tracker.getStats(tool_name, k);
    return ok({ stats });
  } catch (e: any) { return err(e.message || "stats failed"); }
});

server.tool("recommend_tool", {
  task_description: z.string(), k: z.number().default(3),
}, async ({ task_description, k }) => {
  try {
    const recs = tracker.recommend(task_description, k);
    return ok({ recommendations: recs });
  } catch (e: any) { return err(e.message || "recommend failed"); }
});

server.tool("get_tool_timeline", {
  from: z.string().optional(), to: z.string().optional(), k: z.number().default(50),
}, async ({ from, to, k }) => {
  try {
    const events = tracker.getTimeline(from, to, k);
    return ok({ events });
  } catch (e: any) { return err(e.message || "timeline failed"); }
});

server.tool("score_agent", {
  agent: z.string(),
  outcome: z.enum(["success", "failure"]),
  details: z.string().optional(),
  response_time_ms: z.number().optional(),
}, async ({ agent, outcome, response_time_ms }) => {
  try {
    const result = tracker.scoreAgent(agent, outcome, response_time_ms);
    return ok(result);
  } catch (e: any) { return err(e.message || "score_agent failed"); }
});

server.tool("agent_reputation", {
  agent: z.string().optional(),
}, async ({ agent }) => {
  try {
    const agents = tracker.getAgentReputation(agent);
    return ok({ agents });
  } catch (e: any) { return err(e.message || "agent_reputation failed"); }
});

process.on("SIGINT", () => { tracker.close(); process.exit(0); });
process.on("SIGTERM", () => { tracker.close(); process.exit(0); });

const transport = new StdioServerTransport();
await server.connect(transport);
