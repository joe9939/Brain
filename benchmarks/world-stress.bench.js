// world-stress.bench.js — 1K files stress test with dependency graph
const N = 1000;

const start = Date.now();

const files = [];
for (let i = 0; i < N; i++) {
  files.push({ path: `src/module_${Math.floor(i / 50)}/file_${i}.ts`, deps: [] });
}

for (let i = 0; i < N; i++) {
  const depCount = 1 + (i % 5);
  for (let d = 0; d < depCount; d++) {
    const target = (i + d * 3 + 7) % N;
    if (target !== i && !files[i].deps.includes(files[target].path)) {
      files[i].deps.push(files[target].path);
    }
  }
}
const t1 = Date.now();

const depMap = {};
for (const f of files) {
  depMap[f.path] = f.deps;
}

function bfsImpact(target, graph) {
  const visited = new Set([target]);
  const queue = [target];
  const affected = [];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const dep of (graph[node] || [])) {
      if (!visited.has(dep)) { visited.add(dep); affected.push(dep); queue.push(dep); }
    }
  }
  return affected;
}

const impactResults = [];
for (let i = 0; i < 10; i++) {
  const target = files[i * 100].path;
  impactResults.push({ target, affected: bfsImpact(target, depMap).length });
}
const t2 = Date.now();

function riskMap(graph) {
  const risks = {};
  for (const [node, deps] of Object.entries(graph)) {
    const impacted = bfsImpact(node, graph);
    risks[node] = impacted.length;
  }
  return risks;
}

const risks = riskMap(depMap);
const highRisk = Object.entries(risks).filter(([, v]) => v > 50).length;
const t3 = Date.now();

console.log(JSON.stringify({
  name: 'world-stress',
  metrics: {
    files: N,
    avg_deps_per_file: files.reduce((s, f) => s + f.deps.length, 0) / N,
    graph_build_time_ms: t1 - start,
    bfs_10_queries_time_ms: t2 - t1,
    risk_map_time_ms: t3 - t2,
    total_time_ms: t3 - start,
    high_risk_files: highRisk,
    sample_impacts: impactResults.slice(0, 5),
    memory_mb: process.memoryUsage ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 : 0,
  },
  pass: (t3 - start) < 5000,
  message: `${N} files, ${impactResults.length} BFS queries, ${highRisk} high-risk files in ${t3 - start}ms`,
}));
