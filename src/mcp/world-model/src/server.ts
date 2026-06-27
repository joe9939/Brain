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
    case "symbols": {
      if (!target) { result = { error: "target file required for symbols query" }; break; }
      const symbols = graph.getSymbols(target);
      const allSymbols = target === "*" 
        ? Array.from(graph.getAllSymbols())
        : symbols;
      result = { file: target, symbols_found: allSymbols, count: allSymbols.length };
      break;
    }
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

server.tool("world_causal_analyze", {
  action: z.string(),
  target_files: z.array(z.string()),
}, async ({ action, target_files }) => {
  // Map to track visited files and their discovery depth
  const visited = new Set<string>();
  const direct: string[] = [];
  const indirect: string[] = [];
  const cascade: string[] = [];

  // BFS: trace dependents (files that import the target) to measure impact
  // depth 1 = direct importer, depth 2 = indirect, depth 3+ = cascade
  const queue: Array<{ file: string; depth: number }> = [];

  // Seed queue with direct dependents of each target file
  for (const tf of target_files) {
    visited.add(tf);
    for (const dep of graph.getCallers(tf)) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push({ file: dep, depth: 1 });
      }
    }
  }

  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;
    if (depth === 1) direct.push(file);
    else if (depth === 2) indirect.push(file);
    else cascade.push(file);

    if (depth < 5) {
      for (const next of graph.getCallers(file)) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ file: next, depth: depth + 1 });
        }
      }
    }
  }

  const total_affected = direct.length + indirect.length + cascade.length;

  // Core module detection: if any target has >15 dependents, it is central
  const isCore = target_files.some((tf) => graph.getCallers(tf).length > 15);

  const risk: "low" | "medium" | "high" =
    total_affected > 20 || isCore ? "high" : total_affected > 10 ? "medium" : "low";

  const recommendations: string[] = [];
  if (risk === "high") {
    recommendations.push("HIGH RISK: Changes affect >20 files or a core module. Consider phased implementation with feature flags.");
  }
  if (direct.length > 5) {
    recommendations.push(`Directly impacts ${direct.length} files. Run tests on all direct dependents before proceeding.`);
  }
  if (cascade.length > 0) {
    recommendations.push(`Cascade impact detected (${cascade.length} files at depth 3+). Isolate changes to minimize ripple effects.`);
  }
  if (isCore) {
    recommendations.push("Target is a core module (high centrality). Review architecture and consider abstraction layer before change.");
  }
  recommendations.push(`Recommended change order: [${target_files.join(", ")}] → direct dependents → indirect → cascade files`);

  return {
    content: [{ type: "text", text: JSON.stringify({ impact_graph: { direct, indirect, cascade }, risk, total_affected, recommendations }) }],
  };
});

server.tool("world_diff", {
  predicted: z.array(z.string()),
  actual: z.array(z.string()),
}, async ({ predicted, actual }) => {
  const diff = graph.computeDiff(predicted, actual);
  return { content: [{ type: "text", text: JSON.stringify(diff) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);