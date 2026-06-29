module.exports = {
  name: 'PLUGIN: Hook Handlers T1-T4',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const sid = 'p-test-' + Date.now();

      h.onMessage(sid, 'test message');
      const s = h.getMentalState(sid);
      results.push({ name: 'T3: onMessage creates state', pass: s && s.cycle === 1 });

      let t1err = false;
      try { h.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch(e) { t1err = true; }
      results.push({ name: 'T1: G1 blocks rm -rf /', pass: t1err });

      h.onToolBefore(sid, 'bash', { command: 'ls' });
      results.push({ name: 'T1: safe command passes', pass: true });

      h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"gate":"PASS"}');
      h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL"}');
      h.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{}');
      h.onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{}');
      h.onToolAfter(sid, 'task', { category: 'brain-safety' }, '{}');
      const s2 = h.getMentalState(sid);
      results.push({ name: 'T2: 5 L1 agents tracked', pass: s2 && s2.l1.size === 5 });

      h.onToolAfter(sid, 'task', { category: 'brain-swarm-coder' }, 'PASS completed');
      const s3 = h.getMentalState(sid);
      results.push({ name: 'T2: task completion tracked', pass: s3 && s3.M_goal.completed > 0 });

      const sig = h.getStrongestSignal(sid);
      results.push({ name: 'Signal: instruction after L1', pass: Array.isArray(sig) && sig.length > 0 });

      h.onEvent('session.idle', { sessionID: sid });
      results.push({ name: 'T4: idle event handled', pass: true });
    } catch(e) {
      results.push({ name: 'Test error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
