// perf-bench.test.js — C22 BrainTracer performance benchmark
// Outputs JSON: { pass, message, metrics: { ops_per_sec, mem_mb } }
const usedHooks = Symbol('used');

module.exports = {
  name: 'TRACER: perf benchmark',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tperf-' + Date.now();

    // 1. Append latency: 1000 appends under 100ms
    const start1 = Date.now();
    for (let i = 0; i < 1000; i++) B.append(sid, 'perf', { i });
    const ms1 = Date.now() - start1;
    results.push({ name: 'append 1000 under 100ms', pass: ms1 < 100 });
    B.flush(sid, 'perf-1'); // clear for next test

    // 2. Bulk append: 10K events
    const start2 = Date.now();
    for (let i = 0; i < 10000; i++) B.append(sid, 'bulk', { i });
    const ms2 = Date.now() - start2;
    const events = B.export(sid);
    results.push({ name: 'append 10000 under 200ms', pass: ms2 < 200 });
    results.push({ name: 'bulk export returns 1000 (capped)', pass: events.length === 1000 });

    // 3. Memory: export with 1000 events
    const beforeMem = process.memoryUsage().heapUsed;
    const _exp = B.export(sid);
    B.flush(sid, 'perf-2');
    const afterMem = process.memoryUsage().heapUsed;
    const memDelta = (afterMem - beforeMem) / (1024 * 1024);
    results.push({ name: 'export memory under 1MB', pass: memDelta < 1 });

    // 4. Query speed: 1000 events, 100 queries under 10ms
    for (let i = 0; i < 1000; i++) B.append(sid, 'qtest', { i: i % 5 });
    const start3 = Date.now();
    for (let i = 0; i < 100; i++) B.query(sid, { event: 'qtest' });
    const ms3 = Date.now() - start3;
    results.push({ name: '100 queries under 10ms', pass: ms3 < 10 });

    const passed = results.every(r => r.pass);
    const opsPerSec = Math.round(11000 / (ms1 + ms2 + ms3) * 1000);
    return {
      passed,
      message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'),
      time_ms: ms1 + ms2 + ms3,
      metrics: { ops_per_sec: opsPerSec, mem_mb: Math.round(memDelta * 100) / 100 },
    };
  },
};
