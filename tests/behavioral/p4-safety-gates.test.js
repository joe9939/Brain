module.exports = {
  name: 'PATHWAY: safety gates',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'p4-' + Date.now();

    try { hooks.onToolBefore(sid, 'bash', {command: 'rm -rf /'}); R.push({n:'G1 blocks rm -rf /', p:false}); }
    catch(e) { R.push({n:'G1 blocks rm -rf /', p:e.message.includes('G1')}); }

    hooks.onToolBefore(sid, 'bash', {command: 'echo safe'});
    const events = hooks.BrainTracer.query(sid, {event:'T1:before'});
    R.push({n:'T1:before recorded', p:events.length >= 2});
    R.push({n:'Blocked event logged', p:events.some(e => e.data.blocked === true)});

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
