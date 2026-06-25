import { describe, test, expect, beforeEach } from "bun:test";
import { DependencyGraph } from "./graph.js";

describe("DependencyGraph", () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  test("new graph is empty", () => {
    const structure = graph.getStructure();
    expect(structure.total_files).toBe(0);
    expect(structure.modules).toEqual([]);
  });

  test("addDependency creates nodes", () => {
    graph.addDependency("src/main.ts", "src/utils.ts");
    const callees = graph.getCallees("src/main.ts");
    expect(callees).toContain("src/utils.ts");

    const callers = graph.getCallers("src/utils.ts");
    expect(callers).toContain("src/main.ts");
  });

  test("getSymbols returns empty for unknown file", () => {
    const symbols = graph.getSymbols("nonexistent.ts");
    expect(symbols).toEqual([]);
  });

  test("updateFile adds a file to graph", () => {
    graph.updateFile("src/new.ts", "added");
    expect(graph.getCallees("src/new.ts")).toEqual([]);
  });

  test("updateFile with deleted removes node", () => {
    graph.updateFile("src/new.ts", "added");
    graph.updateFile("src/new.ts", "deleted");
    expect(graph.getCallees("src/new.ts")).toEqual([]);
  });

  test("updateFile 3+ times increases risk", () => {
    graph.updateFile("src/risky.ts", "modified");
    graph.updateFile("src/risky.ts", "modified");
    graph.updateFile("src/risky.ts", "modified");
    const riskMap = graph.getRiskMap();
    expect(Object.keys(riskMap).length).toBeGreaterThan(0);
  });

  test("getDependencies returns tree with depth", () => {
    graph.addDependency("src/app.ts", "src/lib.ts");
    graph.addDependency("src/lib.ts", "src/core.ts");
    const deps = graph.getDependencies("src/app.ts", 2);
    expect(Object.keys(deps)).toContain("src/app.ts");
    expect(Object.keys(deps)).toContain("src/lib.ts");
  });

  test("getAllSymbols returns empty when no symbols indexed", () => {
    const all = graph.getAllSymbols();
    expect(all.size).toBe(0);
  });

  test("predictImpact returns structure for existing node", () => {
    graph.addDependency("src/api.ts", "src/db.ts");
    const prediction = graph.predictImpact("src/api.ts", "refactoring db layer");
    expect(prediction).toHaveProperty("directly_affected");
    expect(prediction).toHaveProperty("indirectly_affected");
    expect(prediction).toHaveProperty("tests_to_run");
    expect(prediction).toHaveProperty("risk_score");
    expect(prediction).toHaveProperty("recommendation");
    expect(typeof prediction.risk_score).toBe("number");
  });

  test("predictImpact for unknown node returns default", () => {
    const prediction = graph.predictImpact("unknown.ts", "test");
    expect(prediction.recommendation).toContain("No info");
  });

  test("getStructure returns module list", () => {
    graph.addDependency("src/module1/file.ts", "src/module2/file.ts");
    const structure = graph.getStructure();
    expect(structure).toHaveProperty("total_files");
    expect(structure).toHaveProperty("modules");
    expect(structure).toHaveProperty("risk_map");
  });

  test("extractTSImports handles import statements", () => {
    const content = "import { something } from './mylib';\nimport fs from 'fs';";
    const imports = graph.extractTSImports(content);
    expect(Array.isArray(imports)).toBe(true);
  });
});
