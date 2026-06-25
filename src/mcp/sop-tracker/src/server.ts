import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SOPMatcher } from "./matcher.js";

const matcher = new SOPMatcher();

const server = new McpServer({ name: "sop-tracker", version: "1.0.0" });

server.tool("sop_register", {
  trigger_pattern: z.string().describe("Natural language trigger pattern, e.g. 'deploy *'"),
  steps: z.string().describe("JSON array of step descriptions"),
  preconditions: z.string().optional().describe("Required conditions before SOP execution"),
  tags: z.string().optional().describe("Comma-separated tags for categorization"),
}, async ({ trigger_pattern, steps, preconditions, tags }) => {
  try {
    const sop = matcher.register(trigger_pattern, steps, preconditions || "", tags || "");
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, sop_id: sop.id, trigger_pattern: sop.trigger_pattern }) }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: e.message }) }] };
  }
});

server.tool("sop_match", {
  task_description: z.string().describe("Task description to match against registered SOPs"),
  threshold: z.number().min(0).max(1).optional().default(0.7).describe("Matching threshold (0-1)"),
}, async ({ task_description, threshold }) => {
  try {
    const matches = matcher.match(task_description, threshold);
    return {
      content: [{ type: "text", text: JSON.stringify({ task: task_description, matches, match_count: matches.length }) }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: e.message }) }] };
  }
});

server.tool("sop_decision", {
  sop_id: z.string().describe("SOP ID from sop_match result"),
  confidence: z.number().min(0).max(1).describe("Confidence score from sop_match"),
  context: z.string().optional().describe("Current context for precondition check"),
}, async ({ sop_id, confidence, context }) => {
  try {
    const decision = matcher.decide(sop_id, confidence, context || "");
    return {
      content: [{ type: "text", text: JSON.stringify(decision) }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: e.message }) }] };
  }
});

server.tool("sop_record_outcome", {
  sop_id: z.string().describe("SOP ID to record outcome for"),
  success: z.boolean().describe("Whether SOP execution was successful"),
}, async ({ sop_id, success }) => {
  try {
    matcher.recordOutcome(sop_id, success);
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, sop_id, outcome: success ? "success" : "failure" }) }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: e.message }) }] };
  }
});

server.tool("sop_list", {
  status: z.enum(["active", "all", "deprecated"]).optional().default("active").describe("Filter by SOP status"),
}, async ({ status }) => {
  try {
    const sops = matcher.list(status);
    return {
      content: [{ type: "text", text: JSON.stringify({ sops, count: sops.length }) }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: e.message }) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
