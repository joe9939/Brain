import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DependencyGraph } from "./graph.js";

const graph = new DependencyGraph();
// Auto-index the project on startup
const projectDir = process.env.PROJECT_DIR || process.cwd();
const nodeCount = graph.indexProject(projectDir);

const server = new McpServer({ name: "world-model", version: "1.0.0" });

server.tool("world_query", {
  what: z.enum(["file_info","callers","callees","dependencies","symbols","structure","risk_map"]),
  target: z.string().optional(),
  query: z.string().optional(),
}, async ({ what, target, query }) => {
  if (query) {
    if (query.toLowerCase().includes("caller")) what = "callers";
    else if (query.toLowerCase().includes("structure")) what = "structure";
  }
  let result: any = {};
  switch (what) {
    case "callers": result = { callers: graph.getCallers(target || "") }; break;
    case "callees": result = { callees: graph.getCallees(target || "") }; break;
    case "dependencies": result = graph.getDependencies(target || ""); break;
    case "structure": result = graph.getStructure(); break;
    case "risk_map": result = graph.getRiskMap(); break;
    default: result = { message: "Query type not supported with current indexing" };
  }
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

server.tool("world_update", {
  changed_files: z.array(z.object({ path: z.string(), change_type: z.enum(["added","modified","deleted"]) })),
}, async ({ changed_files }) => {
  const warnings: string[] = [];
  for (const f of changed_files) {
    graph.updateFile(f.path, f.change_type);
    if (f.change_type === "modified") {
      const deps = graph.getCallees(f.path);
      for (const dep of deps) {
        if (graph.getCallees(dep).includes(f.path)) {
          warnings.push(`circular: ${f.path} ↔ ${dep}`);
        }
      }
    }
  }
  return { content: [{ type: "text", text: JSON.stringify({ updated: changed_files.length, warnings, risk_map: graph.getRiskMap() }) }] };
});

server.tool("world_predict", {
  change_target: z.string(),
  description: z.string().optional(),
}, async ({ change_target, description }) => {
  const prediction = graph.predictImpact(change_target, description || "");
  return { content: [{ type: "text", text: JSON.stringify(prediction) }] };
});

server.tool("world_diff", {
  before: z.string(), after: z.string(),
}, async ({ before, after }) => {
  return { content: [{ type: "text", text: JSON.stringify({ impacted_callers: graph.getCallers(before), changed_symbols:[], message:"LSP diff pending" }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);