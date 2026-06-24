import { DependencyNode, PredictionResult } from "./types.js";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private changeCounts: Map<string, number> = new Map();
  private riskMap: Map<string, number> = new Map();

  indexProject(rootDir: string, extensions: string[] = [".ts",".js",".py",".rs"]): number {
    let count = 0;
    try {
      this.scanDir(rootDir, rootDir, extensions, count);
    } catch(e) { /* non-critical */ }
    return this.nodes.size;
  }

  private scanDir(baseDir: string, dir: string, exts: string[], count: number): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'target' || entry === 'dist') continue;
        const full = join(dir, entry);
        try {
          const st = statSync(full);
          if (st.isDirectory()) { this.scanDir(baseDir, full, exts, count); }
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
        const node = this.nodes.get(relPath)!;
        const dep = this.nodes.get(imp)!;
        if (!node.dependencies.includes(imp)) node.dependencies.push(imp);
        if (!dep.dependents.includes(relPath)) dep.dependents.push(relPath);
      }
    } catch(e) { /* skip unreadable files */ }
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
}