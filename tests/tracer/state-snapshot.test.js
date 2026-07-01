// state-snapshot.test.js — C22 BrainTracer M_t state snapshots in T2 events
module.exports = {
  name: 'TRACER: state snapshot',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tss-' + Date.now();

    // 1. onToolAfter with L1 agent records T2:after
    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL"}');
    const t2events = B.query(sid, { event: 'T2:after' });
    results.push({ name: 'L1 onToolAfter records T2:after', pass: t2events.length >= 1 });
    results.push({ name: 'T2:after has tool field', pass: t2events[0] && t2events[0].data && t2events[0].data.tool === 'task' });
    results.push({ name: 'T2:after has category', pass: t2events[0] && t2events[0].data && t2events[0].data.category === 'brain-thalamus' });
    results.push({ name: 'T2:after has l1_size', pass: t2events[0] && t2events[0].data && typeof t2events[0].data.l1_size === 'number' });

    // 2. Multiple L1 calls increment l1_size
    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL"}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{"recent_memories":[]}');
    const allT2 = B.query(sid, { event: 'T2:after' });
    results.push({ name: 'multiple L1 calls tracked', pass: allT2.length === 3 });
    results.push({ name: 'l1_size grows', pass: allT2[2].data.l1_size >= 3 });

    // 3. Non-L1 tool records T2:after too
    hooks.onToolAfter(sid, 'bash', {}, 'done');
    const bashT2 = B.query(sid, { event: 'T2:after' });
    results.push({ name: 'non-L1 tool also recorded', pass: bashT2.length >= 4 });

    // 4. T3:message recorded
    hooks.onMessage(sid, 'hello world');
    const t3 = B.query(sid, { event: 'T3:message' });
    results.push({ name: 'T3:message recorded', pass: t3.length >= 1 });
    results.push({ name: 'T3:message has text_len', pass: t3[0] && t3[0].data && typeof t3[0].data.text_len === 'number' });

    // 5. Full event sequence: T3 → T1 → T2 × N
    const hookSid = 'tss-seq-' + Date.now();
    hooks.onMessage(hookSid, 'run command');
    hooks.onToolBefore(hookSid, 'bash', { command: 'echo ok' });
    hooks.onToolAfter(hookSid, 'bash', {}, 'ok');
    const all = B.export(hookSid);
    const events = all.map(e => e.event);
    results.push({ name: 'event sequence correct', pass: events.includes('T3:message') && events.includes('T1:before') && events.includes('T2:after') });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
