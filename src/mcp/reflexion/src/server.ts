import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Reflector } from "./reflector.js";

const reflector = new Reflector();

const server = new McpServer({ name: "reflexion", version: "1.0.0" });

server.tool("reflexion_start", {
  task_id: z.string().describe("Task ID to start reflexion for"),
  goal: z.string().describe("Original task goal"),
}, async ({ task_id, goal }) => {
  const cycle = reflector.start(task_id, goal);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, cycle_id: cycle.id, status: cycle.status }) }] };
});

server.tool("reflexion_add_observation", {
  cycle_id: z.string().describe("Reflexion cycle ID"),
  observation: z.string().describe("Observation text"),
  type: z.enum(["success", "failure", "surprise"]).describe("Observation type"),
}, async ({ cycle_id, observation, type }) => {
  const obs = reflector.addObservation(cycle_id, observation, type);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, observation_id: obs.id }) }] };
});

server.tool("reflexion_generate_lessons", {
  cycle_id: z.string().describe("Reflexion cycle ID"),
}, async ({ cycle_id }) => {
  const lessons = reflector.generateLessons(cycle_id);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, lessons, count: lessons.length }) }] };
});

server.tool("reflexion_suggest_skill", {
  lesson: z.string().describe("Lesson text to generate skill suggestion from"),
}, async ({ lesson }) => {
  const suggestion = reflector.suggestSkill(lesson);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, suggestion }) }] };
});

server.tool("reflexion_apply", {
  cycle_id: z.string().describe("Reflexion cycle ID to apply suggestions from"),
}, async ({ cycle_id }) => {
  const result = reflector.apply(cycle_id);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
});

server.tool("reflexion_history", {
  k: z.number().optional().default(10).describe("Number of recent reflexion cycles to return"),
}, async ({ k }) => {
  const history = reflector.history(k);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, cycles: history, count: history.length }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
