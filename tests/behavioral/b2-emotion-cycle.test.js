module.exports = {
  name: 'BEHAVIORAL: emotion cycle',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'be-' + Date.now();
    hooks.onMessage(sid, 'hello');
    R.push({n:'starts NORMAL', p: hooks.getMentalState(sid).M_emo.mode === 'NORMAL'});

    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' },
      JSON.stringify({mode:'CAUTION',confidence:0.9}));
    R.push({n:'amygdala sets CAUTION', p: hooks.getMentalState(sid).M_emo.mode === 'CAUTION'});
    R.push({n:'intensity from confidence', p: hooks.getMentalState(sid).M_emo.intensity === 0.9});

    return {passed: R.every(r=>r.p), message: R.map(r=>(r.p?'PASS':'FAIL')+' '+r.n).join('\n'), time_ms: 0};
  },
};
