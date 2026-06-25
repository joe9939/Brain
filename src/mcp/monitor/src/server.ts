import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SystemMonitor } from "./monitor.js";

const monitor = new SystemMonitor();

const server = new McpServer({ name: "monitor", version: "1.0.0" });

server.tool("monitor_report_event", {
  event_type: z.string().describe("Type of event, e.g. 'tool_error', 'mcp_down', 'config_change'"),
  severity: z.enum(["low", "medium", "high", "critical"]).describe("Event severity"),
  source: z.string().describe("Source component, e.g. 'memory-store', 'brain-plugin'"),
  details: z.string().optional().default("").describe("Additional event details"),
}, async ({ event_type, severity, source, details }) => {
  const result = monitor.reportEvent(event_type, severity, source, details);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, event: result.event, alert: result.alert || null }) }] };
});

server.tool("monitor_get_alerts", {
  severity: z.enum(["high", "critical"]).optional().default("high").describe("Minimum severity filter"),
  since: z.string().optional().describe("ISO timestamp: only alerts after this time"),
  k: z.number().optional().default(20).describe("Maximum alerts to return"),
}, async ({ severity, since, k }) => {
  const alerts = monitor.getAlerts(severity, since, k);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, alerts, count: alerts.length }) }] };
});

server.tool("monitor_get_health", {}, async () => {
  const health = monitor.getHealth();
  return { content: [{ type: "text", text: JSON.stringify({ success: true, ...health }) }] };
});

server.tool("monitor_escalate", {
  event_id: z.number().describe("Event ID to escalate"),
  target_agent: z.string().describe("Target agent, e.g. 'safety-cortex', 'orchestrator'"),
}, async ({ event_id, target_agent }) => {
  const result = monitor.escalate(event_id, target_agent);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
