// core-append.test.js — C22 BrainTracer append core behavior
module.exports = {
  name: 'TRACER: core append',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'ta-' + Date.now();

    // 1. Basic append + export
    B.append(sid, 'test', { foo: 1 });
    const events = B.export(sid);
    results.push({ name: 'append records event', pass: events.length === 1 && events[0].event === 'test' });
    results.push({ name: 'append stores data', pass: events[0].data.foo === 1 });
    results.push({ name: 'append includes ts', pass: typeof events[0].ts === 'number' });
    results.push({ name: 'append includes sid', pass: events[0].sid === sid });

    // 2. Multiple events
    B.append(sid, 'evt2', { x: 2 });
    const two = B.export(sid);
    results.push({ name: 'multiple events', pass: two.length === 2 });

    // 3. Different sessions
    const sid2 = 'tb-' + Date.now();
    B.append(sid2, 'other', {});
    results.push({ name: 'session isolation', pass: B.export(sid).length === 2 && B.export(sid2).length === 1 });

    // 4. Buffer cap: 1001 events, last 1000 kept
    for (let i = 0; i < 1001; i++) B.append(sid2, 'bulk', { i });
    const capped = B.export(sid2);
    results.push({ name: 'buffer cap 1000', pass: capped.length === 1000 });
    results.push({ name: 'buffer keeps newest', pass: capped[0].data.i === 1 }); // first evicted

    // 5. Default data = {}
    B.append(sid, 'noargs');
    const noargs = B.export(sid).find(e => e.event === 'noargs');
    results.push({ name: 'default data object', pass: noargs && typeof noargs.data === 'object' });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
