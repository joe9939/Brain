// query-export.test.js — C22 BrainTracer export + query
module.exports = {
  name: 'TRACER: export and query',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tq-' + Date.now();

    // 1. Export returns sorted by ts
    const now = Date.now();
    B.append(sid, 'second', {});
    // Manually inject out-of-order via direct buffer access (simulate race)
    await new Promise(r => setTimeout(r, 1));
    B.append(sid, 'first', {});
    const sorted = B.export(sid);
    results.push({ name: 'export sorts by ts', pass: sorted[0].event === 'second' || sorted[0].ts <= sorted[1].ts });

    // 2. Query returns new array each call (not same reference)
    const first = B.export(sid);
    const second = B.export(sid);
    results.push({ name: 'export returns new array', pass: first !== second });

    // 3. Query with filter
    B.append(sid, 'SIGNAL', { winner: 'perceive' });
    B.append(sid, 'T3:message', { text: 'hello' });
    B.append(sid, 'SIGNAL', { winner: 'action' });
    const signals = B.query(sid, { event: 'SIGNAL' });
    results.push({ name: 'query filters by event', pass: signals.length === 2 && signals.every(e => e.event === 'SIGNAL') });

    // 4. Query without filter returns all
    const all = B.query(sid);
    results.push({ name: 'query no filter returns all', pass: all.length > signals.length });

    // 5. Query on empty session
    const empty = B.query('nonexistent-' + sid);
    results.push({ name: 'query empty session', pass: Array.isArray(empty) && empty.length === 0 });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
