module.exports = {
  name: 'PATHWAY: POST learning',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'p7-' + Date.now();

    hooks.onMessage(sid, 'test');
    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({score:8}));
    }

    for (let i = 0; i < 5; i++) {
      hooks.onToolAfter(sid, 'bash', {}, JSON.stringify({score: 7 + i}));
    }

    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    hooks.onToolAfter(sid, 'bash', {}, 'DONE');

    const s = hooks.getMentalState(sid);
    R.push({ n: 'goals tracked', p: s.M_goal.completed >= 2 });
    R.push({ n: 'reward history recorded', p: s.M_rew.history.length >= 5 });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p?'✓':'✗')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
