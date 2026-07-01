// note.event-check.test.js — C22 BrainTracer event consistency checks
module.exports = {
  name: 'TRACER: event consistency',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tcons-' + Date.now();

    // 1. All events have required fields
    B.append(sid, 'T1:before', { tool: 'bash' });
    B.append(sid, 'T2:after', { tool: 'bash' });
    B.append(sid, 'T3:message', { text_len: 10 });
    B.append(sid, 'SIGNAL', { winner: 'perceive' });
    const all = B.export(sid);
    results.push({ name: 'all events have ts', pass: all.every(e => typeof e.ts === 'number') });
    results.push({ name: 'all events have sid', pass: all.every(e => e.sid === sid) });
    results.push({ name: 'all events have data object', pass: all.every(e => typeof e.data === 'object') });

    // 2. Event ordering matches append order (within same ms)
    const order = all.map(e => e.event);
    results.push({ name: 'event ordering preserved', pass: order.join(',') === 'T1:before,T2:after,T3:message,SIGNAL' });

    // 3. No cross-session contamination
    const sid2 = 'tcons2-' + Date.now();
    B.append(sid2, 'secret', { pin: 1234 });
    const orig = B.export(sid);
    results.push({ name: 'no cross-session leak', pass: !orig.find(e => e.event === 'secret') });

    // 4. T3:message records text_len
    const msg = B.query(sid, { event: 'T3:message' });
    results.push({ name: 'T3:message has text_len', pass: msg[0]?.data?.text_len === 10 });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
