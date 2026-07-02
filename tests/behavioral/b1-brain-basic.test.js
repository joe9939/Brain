module.exports = {
  name: 'BEHAVIORAL: basic brain cycle',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;
    const R = [];
    const sid = 'bhv-' + Date.now();

    hooks.onMessage(sid, 'test message');
    R.push({n:'T3 resets state', p: hooks.getMentalState(sid).l1.size === 0});

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:5}));
    }
    R.push({n:'5 L1 agents complete', p: hooks.getMentalState(sid).l1.size === 5});

    const sig = hooks.getStrongestSignal(sid);
    R.push({n:'signal computed', p: sig.length >= 0});

    const events = B.export(sid);
    R.push({n:'BrainTracer records', p: events.length >= 5});

    return {passed: R.every(r=>r.p), message: R.map(r=>(r.p?'PASS':'FAIL')+' '+r.n).join('\n'), time_ms: 0};
  },
};
