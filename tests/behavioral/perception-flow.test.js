module.exports = {
  name: 'BEHAVIORAL: Perception->Cognition Flow',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');

      // ── Test 1: onMessage creates state, cycles, resets L1 ──
      const sid = 'bf-1-' + Date.now();
      hooks.onMessage(sid, 'hello');
      let s = hooks.getMentalState(sid);
      results.push({ name: 'onMessage creates cycle===1', pass: s.cycle === 1 });
      results.push({ name: 'onMessage resets l1 to empty set', pass: s.l1.size === 0 });
      results.push({ name: 'onMessage resets _last_signal to null', pass: s._last_signal === null });

      // ── Test 2: 5x L1 agents tracked via onToolAfter ──
      const sid2 = 'bf-2-' + Date.now();
      hooks.onMessage(sid2, 'perceive');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
      for (const agent of L1) {
        hooks.onToolAfter(sid2, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.7, score: 1 }));
      }
      s = hooks.getMentalState(sid2);
      results.push({ name: '5 L1 agents all tracked', pass: s.l1.size === 5 });
      results.push({ name: 'working memory populated for all L1', pass: Object.keys(s.wm).length === 5 });

      // ── Test 3: getStrongestSignal returns instruction after L1 ──
      // L1 complete + 1 goal completed + td_error != 0 → learning signal
      hooks.onToolAfter(sid2, 'bash', {}, 'All tests PASS');
      const sig = hooks.getStrongestSignal(sid2);
      results.push({ name: 'getStrongestSignal returns instruction array', pass: Array.isArray(sig) && sig.length > 0 });
      results.push({ name: 'instruction has system role', pass: sig[0] && sig[0].role === 'system' });
      results.push({ name: 'instruction has content', pass: sig[0] && typeof sig[0].content === 'string' && sig[0].content.length > 0 });

      // ── Test 4: onToolAfter with completion increments M_goal ──
      const sid3 = 'bf-4-' + Date.now();
      hooks.onMessage(sid3, 'do tasks');
      for (const agent of L1) {
        hooks.onToolAfter(sid3, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 2 }));
      }
      s = hooks.getMentalState(sid3);
      const before = s.M_goal.completed;
      hooks.onToolAfter(sid3, 'bash', {}, 'DONE all tasks');
      s = hooks.getMentalState(sid3);
      results.push({ name: 'M_goal.completed incremented', pass: s.M_goal.completed === before + 1 });

      // ── Test 5: Full cycle: perceive->learn->reward update ──
      const sid4 = 'bf-5-' + Date.now();
      hooks.onMessage(sid4, 'full cycle test');
      s = hooks.getMentalState(sid4);
      results.push({ name: 'perceive: onMessage resets state', pass: s.cycle === 1 && s.l1.size === 0 });
      // Fire L1
      for (const agent of L1) {
        hooks.onToolAfter(sid4, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.6, score: 3 }));
      }
      s = hooks.getMentalState(sid4);
      results.push({ name: 'learn: L1 populates wm and updates reward', pass: s.M_rew.score === 3 && s.l1.size === 5 });
      // Completion triggers td_error
      hooks.onToolAfter(sid4, 'bash', {}, 'completed successfully');
      s = hooks.getMentalState(sid4);
      results.push({ name: 'reward: td_error computed after completion', pass: typeof s.td_error === 'number' && s.M_goal.completed >= 1 });
    } catch(e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
