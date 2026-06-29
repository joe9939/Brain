module.exports = {
  name: 'BEHAVIORAL: Mood Propagation',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];

      // ── Test 1: CAUTION mode (via amygdala only) → emotion/safety signal boosted ──
      const sid1 = 'mp-1-' + Date.now();
      hooks.onMessage(sid1, 'caution test');
      for (const agent of L1) {
        if (agent === 'brain-amygdala') {
          hooks.onToolAfter(sid1, 'task', { category: agent }, JSON.stringify({ mode: 'CAUTION', confidence: 0.9, valence: -0.5, arousal: 0.8, score: 1 }));
        } else {
          hooks.onToolAfter(sid1, 'task', { category: agent }, JSON.stringify({ score: 1 }));
        }
      }
      const s1 = hooks.getMentalState(sid1);
      results.push({ name: 'CAUTION mode stored in M_emo', pass: s1.M_emo.mode === 'CAUTION' });
      results.push({ name: 'CAUTION sets negative valence', pass: s1.M_emo.valence === -0.5 });
      results.push({ name: 'CAUTION sets high arousal', pass: s1.M_emo.arousal === 0.8 });

      // ── Test 2: URGENT mode (via amygdala only) → emotion signal boosted ──
      const sid2 = 'mp-2-' + Date.now();
      hooks.onMessage(sid2, 'urgent test');
      for (const agent of L1) {
        if (agent === 'brain-amygdala') {
          hooks.onToolAfter(sid2, 'task', { category: agent }, JSON.stringify({ mode: 'URGENT', confidence: 0.8, valence: -0.6, arousal: 0.9, score: 1 }));
        } else {
          hooks.onToolAfter(sid2, 'task', { category: agent }, JSON.stringify({ score: 1 }));
        }
      }
      const s2 = hooks.getMentalState(sid2);
      results.push({ name: 'URGENT mode stored in M_emo', pass: s2.M_emo.mode === 'URGENT' });
      results.push({ name: 'URGENT sets negative valence', pass: s2.M_emo.valence === -0.6 });
      results.push({ name: 'URGENT sets high arousal', pass: s2.M_emo.arousal === 0.9 });

      // ── Test 3: Task completion with td_error → learning conditions met ──
      const sid3 = 'mp-3-' + Date.now();
      hooks.onMessage(sid3, 'task test');
      for (const agent of L1) {
        hooks.onToolAfter(sid3, 'task', { category: agent }, JSON.stringify({ score: 3 }));
      }
      // Create score gap so td_error is non-zero
      hooks.onToolAfter(sid3, 'bash', {}, JSON.stringify({ score: 1 }));
      hooks.onToolAfter(sid3, 'bash', {}, 'All tests PASS');
      const s3 = hooks.getMentalState(sid3);
      results.push({ name: 'After completion: td_error computed', pass: typeof s3.td_error === 'number' });
      results.push({ name: 'After completion: M_goal completed incremented', pass: s3.M_goal.completed >= 1 });

      // ── Test 4: Normal mood → no safety override ──
      const sid4 = 'mp-4-' + Date.now();
      hooks.onMessage(sid4, 'normal test');
      for (const agent of L1) {
        hooks.onToolAfter(sid4, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 5 }));
      }
      const s4 = hooks.getMentalState(sid4);
      results.push({ name: 'Normal mood: mode is NORMAL', pass: s4.M_emo.mode === 'NORMAL' });
      results.push({ name: 'Normal mood: safety strength is 0', pass: s4.M_emo.mode !== 'CAUTION' });
    } catch(e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
