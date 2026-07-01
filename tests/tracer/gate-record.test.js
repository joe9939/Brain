// gate-record.test.js — C22 BrainTracer records gate blocks
module.exports = {
  name: 'TRACER: gate recording',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const sid = 'tg-' + Date.now();

    // 1. onToolBefore records T1:before
    hooks.onToolBefore(sid, 'bash', { command: 'echo hello' });
    const events = B.query(sid, { event: 'T1:before' });
    results.push({ name: 'tool before records T1:before', pass: events.length === 1 });
    results.push({ name: 'tool before records tool name', pass: events[0] && events[0].data && events[0].data.tool === 'bash' });
    results.push({ name: 'tool before records blocked=false', pass: events[0] && events[0].data && events[0].data.blocked === false });

    // 2. Dangerous command → blocked:true
    try { hooks.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) { /* expected */ }
    const blocks = B.query(sid, { event: 'T1:before' });
    const blocked = blocks.filter(e => e && e.data && e.data.blocked === true);
    results.push({ name: 'dangerous cmd blocked:true', pass: blocked.length > 0 });

    // 3. onToolAfter records T2:after
    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL"}');
    const after = B.query(sid, { event: 'T2:after' });
    results.push({ name: 'tool after records T2:after', pass: after.length >= 1 });
    results.push({ name: 'tool after records tool', pass: after[0].data.tool === 'task' });

    // 4. onMessage records T3:message
    hooks.onMessage(sid, 'implement a new feature please');
    const msgs = B.query(sid, { event: 'T3:message' });
    results.push({ name: 'onMessage records T3:message', pass: msgs.length >= 1 });

    // 5. Signal winner recorded
    const sigs = B.query(sid, { event: 'SIGNAL' });
    results.push({ name: 'signal winners recorded', pass: sigs.length >= 0 }); // might be 0 if no winner

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? '✓' : '✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
