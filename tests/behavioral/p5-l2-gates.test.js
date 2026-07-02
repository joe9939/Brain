module.exports = {
  name: 'PATHWAY: L2 gates',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'p5-' + Date.now();

    // Simulate a complex task that triggers swarm
    hooks.onMessage(sid, 'implement complex microservice architecture with kubernetes deployment monitoring stack alerting logging and healthcheck dashboard configuration scaling');
    const s1 = hooks.getMentalState(sid);
    R.push({ n: 'swarm detected for complex task', p: s1.swarm === true });

    // Complete L1 agents with reward score < 3 (triggers reward cortex)
    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({score: 2}));
    }
    const s2 = hooks.getMentalState(sid);
    R.push({ n: 'L1 complete (5/5)', p: s2.l1.size === 5 });
    R.push({ n: 'low score triggers reward signal', p: s2.M_rew.score < 3 });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
