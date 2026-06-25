import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PriorityQueue } from "./queue.js";

const queue = new PriorityQueue();

const server = new McpServer({ name: "priority-queue", version: "1.0.0" });

server.tool("queue_add", {
  id: z.string().describe("Task ID"),
  description: z.string().describe("Task description"),
  urgency: z.number().min(0).max(1).optional().default(0.5).describe("Urgency score 0-1"),
  effort_estimate: z.number().min(0).optional().default(1).describe("Estimated effort in arbitrary units"),
  dependencies: z.array(z.string()).optional().default([]).describe("Task IDs this task depends on"),
  context: z.string().optional().default("").describe("Additional context"),
}, async ({ id, description, urgency, effort_estimate, dependencies, context }) => {
  const task = queue.add(id, description, urgency, effort_estimate, dependencies, context);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, task }) }] };
});

server.tool("queue_prioritize", {}, async () => {
  const result = queue.prioritize();
  return { content: [{ type: "text", text: JSON.stringify({ success: true, reordered: result.reordered, formula: result.formula }) }] };
});

server.tool("queue_next", {
  k: z.number().optional().default(1).describe("Number of next tasks to retrieve"),
}, async ({ k }) => {
  const tasks = queue.next(k);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, tasks, count: tasks.length }) }] };
});

server.tool("queue_complete", {
  id: z.string().describe("Task ID to mark complete"),
}, async ({ id }) => {
  const task = queue.complete(id);
  if (!task) return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Task not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify({ success: true, task }) }] };
});

server.tool("queue_blocked_by", {
  id: z.string().describe("Task ID to check blockers for"),
}, async ({ id }) => {
  const result = queue.blockedBy(id);
  if (!result.task) return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Task not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify({ success: true, task: result.task, blockers: result.blockers }) }] };
});

server.tool("queue_stats", {}, async () => {
  const stats = queue.stats();
  return { content: [{ type: "text", text: JSON.stringify({ success: true, ...stats }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
