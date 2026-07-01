// core-flush.test.js — C22 BrainTracer flush behavior
module.exports = {
  name: 'TRACER: core flush',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tf-' + Date.now();

    // 1. Flush returns payload
    B.append(sid, 'evt1', { a: 1 });
    B.append(sid, 'evt2', { b: 2 });
    const payload = B.flush(sid, 'msg-1');
    results.push({ name: 'flush returns trace array', pass: payload && payload.trace && payload.trace.length === 2 });
    results.push({ name: 'flush includes session', pass: payload.session === sid });
    results.push({ name: 'flush includes message id', pass: payload.message === 'msg-1' });

    // 2. Flush clears buffer
    const after = B.export(sid);
    results.push({ name: 'flush clears buffer', pass: after.length === 0 });

    // 3. Flush empty buffer returns undefined
    const empty = B.flush(sid, 'msg-2');
    results.push({ name: 'flush empty is noop', pass: empty === undefined });

    // 4. Flush is idempotent
    const again = B.flush(sid, 'msg-3');
    results.push({ name: 'flush idempotent', pass: again === undefined });

    // 5. Flush preserves event data
    B.append(sid, 'rich', { deep: { k: 'v' }, arr: [1,2,3] });
    const p2 = B.flush(sid, 'msg-4');
    results.push({ name: 'flush preserves data', pass: p2.trace[0].data.deep.k === 'v' });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
