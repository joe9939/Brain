module.exports = {
  name: 'PATHWAY: full pipeline',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const R = [];
    const sid = 'p8-' + Date.now();

    hooks.onMessage(sid, 'implement complex microservice architecture kubernetes');
    hooks.getStrongestSignal(sid); // consume perceive signal

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:5}));
    }
    R.push({ n: 'L1: 5/5 complete', p: hooks.getMentalState(sid).l1.size === 5 });

    hooks.getStrongestSignal(sid);

    hooks.onToolAfter(sid, 'task', { category: 'brain-reward' }, JSON.stringify({score:5,risk:'low'}));

    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    R.push({ n: 'POST: goals > 0', p: hooks.getMentalState(sid).M_goal.completed > 0 });

    const events = B.export(sid);
    R.push({ n: 'TRACER: events recorded', p: events.length > 5 });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
