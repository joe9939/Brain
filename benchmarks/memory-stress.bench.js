// memory-stress.bench.js — 10K records stress test
const N = 10000;

const start = Date.now();
const memories = [];

for (let i = 0; i < N; i++) {
  memories.push({
    id: `mem_stress_${i}`,
    type: ['episodic', 'semantic', 'procedural', 'working'][i % 4],
    content: `Memory content entry number ${i} with various keywords for search testing pattern ${i % 10}`,
    tags: [`tag_${i % 50}`, `topic_${i % 8}`, `priority_${i % 3}`],
    importance: Math.random(),
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    last_accessed: i % 5 === 0 ? new Date().toISOString() : new Date(Date.now() - i * 7200000).toISOString(),
    access_count: Math.floor(Math.random() * 50),
  });
}

const t1 = Date.now();

function keywordSearch(query, mems) {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  return mems.filter(m => keywords.some(k => m.content.toLowerCase().includes(k)))
    .map(m => ({ ...m, score: keywords.filter(k => m.content.toLowerCase().includes(k)).length / keywords.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

const searchResults = keywordSearch('memory content search', memories);
const t2 = Date.now();

function decayAll(mems, daysThreshold) {
  let decayed = 0;
  const now = Date.now();
  for (const m of mems) {
    const age = (now - new Date(m.last_accessed).getTime()) / 86400000;
    if (age > daysThreshold) { m.importance *= 0.5; decayed++; }
  }
  return decayed;
}

const decayed = decayAll(memories, 30);
const t3 = Date.now();

console.log(JSON.stringify({
  name: 'memory-stress',
  metrics: {
    records: N,
    insert_time_ms: t1 - start,
    search_time_ms: t2 - t1,
    decay_time_ms: t3 - t2,
    total_time_ms: t3 - start,
    search_results: searchResults.length,
    decayed,
    memory_mb: process.memoryUsage ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 : 0,
  },
  pass: (t3 - start) < 5000,
  message: `${N} records: insert ${t1 - start}ms, search ${t2 - t1}ms, decay ${t3 - t2}ms`,
}));
