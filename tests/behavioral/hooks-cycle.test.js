module.exports = {
  name: 'BEHAVIORAL: Hook Signal Cycle',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');
      const sid = 'btest-' + Date.now();
      hooks.onMessage(sid, 'hello world');
      const s1 = hooks.getMentalState(sid);
      results.push({ name: 'T3: cycle starts', pass: s1 && s1.cycle === 1 });
      hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"gate":"PASS","urgency":0.5}');
      hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.8}');
      hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{"episodic":[],"semantic":[]}');
      hooks.onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{"relevant_files":[]}');
      hooks.onToolAfter(sid, 'task', { category: 'brain-safety' }, '{"risk_level":"normal"}');
      const s2 = hooks.getMentalState(sid);
      results.push({ name: 'T2: 5/5 L1 complete', pass: s2 && s2.l1 && s2.l1.size === 5 });
      const wm = hooks.getWorkingMemory(sid);
      results.push({ name: 'WM: thalamus stored', pass: wm && wm.thalamus && wm.thalamus.gate === 'PASS' });
      results.push({ name: 'WM: amygdala stored', pass: wm && wm.amygdala && wm.amygdala.mode === 'NORMAL' });
      const sig = hooks.getStrongestSignal(sid);
      results.push({ name: 'Signal: instruction returned', pass: Array.isArray(sig) && sig.length > 0 });
    } catch (e) {
      results.push({ name: 'Hook import: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
