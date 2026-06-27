import { DependencyNode, PredictionResult, PredictedFile, PredictionResultV2, DiffResult, SymbolInfo } from "./types.js";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private changeCounts: Map<string, number> = new Map();
  private riskMap: Map<string, number> = new Map();
  private diffHistory: number[] = [];

  indexProject(rootDir: string, extensions: string[] = [".ts",".js",".py",".rs"]): number {
    try {
      this.scanDir(rootDir, rootDir, extensions);
    } catch(e) { /* non-critical */ }
    return this.nodes.size;
  }

  private scanDir(baseDir: string, dir: string, exts: string[]): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'target' || entry === 'dist') continue;
        const full = join(dir, entry);
        try {
          const st = statSync(full);
          if (st.isDirectory()) { this.scanDir(baseDir, full, exts); }
          else if (exts.includes(extname(entry))) {
            this.indexFile(baseDir, full);
          }
        } catch(e) { /* skip inaccessible files */ }
      }
    } catch(e) { /* skip inaccessible dirs */ }
  }

  private indexFile(baseDir: string, filePath: string): void {
    const relPath = filePath.replace(baseDir, '').replace(/^[\\\/]/, '');
    if (!this.nodes.has(relPath)) {
      this.nodes.set(relPath, { file: relPath, dependencies: [], dependents: [] });
    }
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath);
      const lang = ext === '.ts' ? 'typescript' : ext === '.js' ? 'javascript' : ext === '.py' ? 'python' : 'rust';
      
      // Extract symbols (AST-level) based on file type
      const symbols = this.extractSymbols(content, ext, lang);
      const node = this.nodes.get(relPath)!;
      node.symbols = symbols;

      // Extract imports based on file type
      let imports: string[] = [];
      if (ext === '.ts' || ext === '.js') {
        imports = this.extractTSImports(content);
      } else if (ext === '.py') {
        imports = this.extractPyImports(content);
      } else if (ext === '.rs') {
        imports = this.extractRustImports(content);
      }

      for (const imp of imports) {
        if (!this.nodes.has(imp)) {
          this.nodes.set(imp, { file: imp, dependencies: [], dependents: [] });
        }
        const dep = this.nodes.get(imp)!;
        if (!node.dependencies.includes(imp)) node.dependencies.push(imp);
        if (!dep.dependents.includes(relPath)) dep.dependents.push(relPath);
      }
    } catch(e) { /* skip unreadable files */ }
  }

  /**
   * AST-level symbol extraction via regex patterns for .ts/.js/.py/.rs
   */
  private extractSymbols(content: string, ext: string, lang: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    let pattern: RegExp;
    let kindMap: (m: RegExpExecArray) => SymbolInfo["kind"];

    if (ext === '.ts' || ext === '.js') {
      // export function name( | export async function name( | function name( | export class name | class name | export interface name | interface name | export type name = | const name = | export const name =
      pattern = /^(?:export\s+)?(?:async\s+)?function\s+(?:(?!if|while|for)\w+)\s*\(|^(?:export\s+)?class\s+(\w+)|^(?:export\s+)?interface\s+(\w+)|^(?:export\s+)?type\s+(\w+)\s*=|^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=|^(?:export\s+)?abstract\s+class\s+(\w+)/gm;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(content)) !== null) {
        const line = content.substring(0, m.index).split('\n').length;
        const text = m[0];
        if (m[0].includes('function')) {
          const name = m[0].match(/function\s+(\w+)/);
          if (name) symbols.push({ name: name[1], kind: 'function', lang, line });
        } else if (text.includes('interface')) {
          const match = m[1] || m[2] || m[3] || m[4] || m[5];
          // Figure out which group matched
          for (let i = 1; i <= 5; i++) {
            if (m[i]) { symbols.push({ name: m[i], kind: 'interface', lang, line }); break; }
          }
        } else if (text.includes('class')) {
          for (let i = 1; i <= 5; i++) {
            if (m[i]) { symbols.push({ name: m[i], kind: 'class', lang, line }); break; }
          }
        } else if (text.includes('type ')) {
          for (let i = 1; i <= 5; i++) {
            if (m[i]) { symbols.push({ name: m[i], kind: 'type', lang, line }); break; }
          }
        } else {
          for (let i = 1; i <= 5; i++) {
            if (m[i]) { symbols.push({ name: m[i], kind: 'variable', lang, line }); break; }
          }
        }
      }
    } else if (ext === '.py') {
      pattern = /^(?:async\s+)?def\s+(\w+)\s*\(|^class\s+(\w+)/gm;
      while ((m = pattern.exec(content)) !== null) {
        const line = content.substring(0, m.index).split('\n').length;
        if (m[1]) symbols.push({ name: m[1], kind: 'function', lang, line });
        else if (m[2]) symbols.push({ name: m[2], kind: 'class', lang, line });
      }
    } else if (ext === '.rs') {
      pattern = /^fn\s+(\w+)|^pub\s+fn\s+(\w+)|^struct\s+(\w+)|^enum\s+(\w+)|^trait\s+(\w+)|^impl\s+(\w+)|^type\s+(\w+)/gm;
      while ((m = pattern.exec(content)) !== null) {
        const line = content.substring(0, m.index).split('\n').length;
        const text = m[0];
        if (text.startsWith('fn') || text.includes(' fn ')) {
          for (let i = 1; i <= 2; i++) if (m[i]) { symbols.push({ name: m[i], kind: 'function', lang, line }); break; }
        } else if (text.startsWith('struct')) {
          if (m[3]) symbols.push({ name: m[3], kind: 'struct', lang, line });
        } else if (text.startsWith('enum')) {
          if (m[4]) symbols.push({ name: m[4], kind: 'enum', lang, line });
        } else if (text.startsWith('trait')) {
          if (m[5]) symbols.push({ name: m[5], kind: 'trait', lang, line });
        } else if (text.startsWith('impl')) {
          if (m[6]) symbols.push({ name: m[6], kind: 'impl', lang, line });
        } else if (text.startsWith('type')) {
          if (m[7]) symbols.push({ name: m[7], kind: 'type', lang, line });
        }
      }
    }

    return symbols;
  }

  getSymbols(target: string): SymbolInfo[] {
    const node = this.nodes.get(target);
    return node?.symbols || [];
  }

  getAllSymbols(): Map<string, SymbolInfo[]> {
    const all = new Map<string, SymbolInfo[]>();
    for (const [file, node] of this.nodes) {
      if (node.symbols && node.symbols.length > 0) {
        all.set(file, node.symbols);
      }
    }
    return all;
  }

  private extractTSImports(content: string): string[] {
    const imports: string[] = [];
    const re = /(?:import|from)\s+['"](.+?)['"]|require\(['"](.+?)['"]\)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const imp = (m[1] || m[2]).replace(/^\.\//, '').replace(/\.\.\//, '');
      if (!imp.startsWith('@') && !imp.includes('node_modules')) {
        imports.push(imp.replace(/\//g, '\\'));
      }
    }
    return imports;
  }

  private extractPyImports(content: string): string[] {
    const imports: string[] = [];
    const re = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const imp = (m[1] || m[2]).replace(/\./g, '/') + '.py';
      imports.push(imp);
    }
    return imports;
  }

  private extractRustImports(content: string): string[] {
    const imports: string[] = [];
    const re = /use\s+(\S+?);/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const imp = m[1].replace(/::/g, '/') + '.rs';
      imports.push(imp);
    }
    return imports;
  }

  getCallers(target: string): string[] {
    const node = this.nodes.get(target);
    return node?.dependents || [];
  }

  getCallees(target: string): string[] {
    const node = this.nodes.get(target);
    return node?.dependencies || [];
  }

  getDependencies(target: string, depth: number = 2): Record<string, any> {
    const result: Record<string, any> = {};
    const visited = new Set<string>();
    const bfs = (file: string, d: number) => {
      if (d > depth || visited.has(file)) return;
      visited.add(file);
      const node = this.nodes.get(file);
      if (!node) return;
      result[file] = { deps: node.dependencies, depth: d };
      for (const dep of node.dependencies) bfs(dep, d + 1);
    };
    bfs(target, 1);
    return result;
  }

  getStructure(): Record<string, any> {
    const mods = new Set<string>();
    for (const [file] of this.nodes) {
      const parts = file.split(/[\\\/]/);
      if (parts.length > 1) mods.add(parts[0]);
    }
    return { total_files: this.nodes.size, modules: Array.from(mods).slice(0, 50), risk_map: Object.fromEntries(this.riskMap) };
  }

  getRiskMap(): Record<string, number> { return Object.fromEntries(this.riskMap); }

  updateFile(file: string, changeType: string): void {
    if (changeType === "deleted") { this.nodes.delete(file); this.riskMap.delete(file); return; }
    if (!this.nodes.has(file)) this.nodes.set(file, { file, dependencies: [], dependents: [] });
    const count = (this.changeCounts.get(file) || 0) + 1;
    this.changeCounts.set(file, count);
    if (count >= 3) this.riskMap.set(file, 7 + Math.min(count - 3, 3));
  }

  addDependency(from: string, to: string): void {
    if (!this.nodes.has(from)) this.updateFile(from, "added");
    if (!this.nodes.has(to)) this.updateFile(to, "added");
    const fn = this.nodes.get(from)!; const tn = this.nodes.get(to)!;
    if (!fn.dependencies.includes(to)) fn.dependencies.push(to);
    if (!tn.dependents.includes(from)) tn.dependents.push(from);
  }

  predictImpact(target: string, description: string): PredictionResult {
    const node = this.nodes.get(target);
    if (!node) return { directly_affected:[], indirectly_affected:[], tests_to_run:[], risk_score:1, recommendation:"No info. Index the project first." };
    const direct = node.dependents;
    const indirect: string[] = [];
    for (const d of direct) { const dn = this.nodes.get(d); if (dn) for (const dd of dn.dependents) if (dd !== target && !direct.includes(dd)) indirect.push(dd); }
    const tests = [...direct, ...indirect].filter(f => f.includes(".test.") || f.includes(".spec.") || f.includes("tests/"));
    const risk = Math.min(10, direct.length * 2 + indirect.length + (this.riskMap.get(target) || 0));
    return { directly_affected: direct, indirectly_affected: indirect, tests_to_run: tests, risk_score: risk, recommendation: risk>6?"HIGH RISK":risk>3?"MEDIUM":"LOW" };
  }

  predictImpactV2(description: string, targets: string[], _context: string): PredictionResultV2 {
    // Determine starting files
    let startFiles: string[] = [];
    if (targets.length > 0) {
      startFiles = targets;
    } else {
      // Derive candidate files from description keywords
      const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const [file] of this.nodes) {
        if (keywords.some(k => file.toLowerCase().includes(k))) {
          startFiles.push(file);
        }
      }
    }

    if (startFiles.length === 0) {
      return {
        predicted_files: [],
        risk_level: "low",
        confidence: 0,
        estimated_effort: "No files found matching the action description. Index the project first."
      };
    }

    const predictedFiles: PredictedFile[] = [];
    const visited = new Set<string>();
    let maxCentrality = 0;

    for (const target of startFiles) {
      const node = this.nodes.get(target);
      if (!node) continue;

      // The target file itself — high probability of change
      if (!visited.has(target)) {
        visited.add(target);
        const centrality = node.dependents.length;
        if (centrality > maxCentrality) maxCentrality = centrality;
        // Base 0.5 + 0.1 per dependent (capped at 1.0)
        const prob = Math.min(1.0, 0.5 + centrality * 0.1 + (this.riskMap.get(target) || 0) * 0.05);
        const type: "high" | "medium" | "low" = prob >= 0.7 ? "high" : prob >= 0.4 ? "medium" : "low";
        predictedFiles.push({ path: target, change_probability: Math.round(prob * 100) / 100, type });
      }

      // Direct dependents (callers) — medium probability
      for (const dep of node.dependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          const depNode = this.nodes.get(dep);
          const centrality = depNode ? depNode.dependents.length : 0;
          const prob = Math.min(1.0, 0.3 + centrality * 0.08 + (this.riskMap.get(dep) || 0) * 0.04);
          const type: "high" | "medium" | "low" = prob >= 0.7 ? "high" : prob >= 0.4 ? "medium" : "low";
          predictedFiles.push({ path: dep, change_probability: Math.round(prob * 100) / 100, type });
        }
      }

      // Indirect dependents (one more hop) — low probability
      for (const directDep of node.dependents) {
        const directNode = this.nodes.get(directDep);
        if (!directNode) continue;
        for (const indirectDep of directNode.dependents) {
          if (!visited.has(indirectDep) && indirectDep !== target) {
            visited.add(indirectDep);
            const prob = 0.15 + (this.riskMap.get(indirectDep) || 0) * 0.03;
            predictedFiles.push({
              path: indirectDep,
              change_probability: Math.round(Math.min(1.0, prob) * 100) / 100,
              type: "low"
            });
          }
        }
      }
    }

    // Overall risk level from max change probability
    const maxProb = Math.max(...predictedFiles.map(f => f.change_probability), 0);
    const riskLevel: "low" | "medium" | "high" = maxProb >= 0.7 ? "high" : maxProb >= 0.4 ? "medium" : "low";

    // Confidence based on how much of the graph was explored
    const exploredRatio = predictedFiles.length / Math.max(1, this.nodes.size);
    const confidence = Math.min(0.95, 0.3 + predictedFiles.length * 0.08 - exploredRatio * 0.1);

    // Effort estimate based on count and severity
    const highCount = predictedFiles.filter(f => f.type === "high").length;
    const medCount = predictedFiles.filter(f => f.type === "medium").length;
    const lowCount = predictedFiles.filter(f => f.type === "low").length;
    const totalEffort = highCount * 3 + medCount * 1.5 + lowCount * 0.5;
    const effortDesc = totalEffort > 20
      ? `Large (${highCount} high, ${medCount} medium, ${lowCount} low impact files)`
      : totalEffort > 8
        ? `Medium (${highCount} high, ${medCount} medium, ${lowCount} low impact files)`
        : totalEffort > 0
          ? `Small (${highCount} high, ${medCount} medium, ${lowCount} low impact files)`
          : "Minimal — no predicted file changes";

    return {
      predicted_files: predictedFiles,
      risk_level: riskLevel,
      confidence: Math.round(confidence * 100) / 100,
      estimated_effort: effortDesc
    };
  }

  computeDiff(predicted: string[], actual: string[]): DiffResult {
    const predictedSet = new Set(predicted);
    const actualSet = new Set(actual);

    const correct = predicted.filter(p => actualSet.has(p));
    const falsePositives = predicted.filter(p => !actualSet.has(p));
    const missed = actual.filter(a => !predictedSet.has(a));

    const precision = predicted.length > 0 ? correct.length / predicted.length : 1;
    const recall = actual.length > 0 ? correct.length / actual.length : 1;
    // F1-style accuracy: harmonic mean of precision and recall when both > 0
    let accuracy: number;
    if (precision + recall > 0) {
      accuracy = 2 * precision * recall / (precision + recall);
    } else {
      accuracy = 1; // both empty => perfect match
    }

    // Track history for trend detection
    this.diffHistory.push(accuracy);
    if (this.diffHistory.length > 10) this.diffHistory.shift();

    // Determine trend from recent history
    let trend: "improving" | "stable" | "declining" = "stable";
    if (this.diffHistory.length >= 4) {
      const recent = this.diffHistory.slice(-2);
      const older = this.diffHistory.slice(-4, -2);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
      if (avgRecent > avgOlder + 0.05) trend = "improving";
      else if (avgRecent < avgOlder - 0.05) trend = "declining";
    }

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      precision: Math.round(precision * 100) / 100,
      recall: Math.round(recall * 100) / 100,
      missed,
      false_positives: falsePositives,
      correct,
      trend
    };
  }
}