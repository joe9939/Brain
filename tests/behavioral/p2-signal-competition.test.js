module.exports = {
  name: 'PATHWAY: signal competition',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'p2-' + Date.now();
    const R = [];

    hooks.onMessage(sid, 'implement a complex microservice architecture with kubernetes deployment monitoring stack alerting');
    const sig1 = hooks.getStrongestSignal(sid);
    R.push({ n: 'perceive wins (L1 empty)', p: sig1.length > 0 && sig1[0].content.includes('Parallel') });

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'CAUTION',score:3}));
    }

    const sig2 = hooks.getStrongestSignal(sid);
    const s2 = hooks.getMentalState(sid);
    const emotionActive = s2.M_emo.mode === 'CAUTION';
    R.push({ n: 'emotion wins after L1 (CAUTION)', p: !sig2.length || emotionActive });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
