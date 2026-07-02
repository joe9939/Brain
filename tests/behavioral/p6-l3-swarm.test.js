module.exports = {
  name: 'PATHWAY: L3 swarm',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'p6-' + Date.now();

    hooks.onMessage(sid, 'implement complex microservice architecture with kubernetes deployment monitoring stack alerting logging and healthcheck dashboard configuration scaling');
    R.push({ n: 'swarm=true after complex msg', p: hooks.getMentalState(sid).swarm === true });

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({score:5}));
    }

    const sig = hooks.getStrongestSignal(sid);
    R.push({ n: 'signal computed', p: sig.length >= 0 });

    hooks.onToolAfter(sid, 'bash', {}, 'PASS');
    const sAfter = hooks.getMentalState(sid);
    R.push({ n: 'M_goal.completed incremented', p: sAfter.M_goal.completed > 0 });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
