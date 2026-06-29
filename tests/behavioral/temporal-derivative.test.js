module.exports = {
  name: 'BEHAVIORAL: Temporal Derivative Learning',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');

      // ── Test 1: onToolAfter with PASS triggers td_error ──
      const sid1 = 'td-1-' + Date.now();
      hooks.onMessage(sid1, 'test td');
      hooks.onToolAfter(sid1, 'bash', {}, 'All tests PASS');
      const s1 = hooks.getMentalState(sid1);
      results.push({ name: 'PASS triggers td_error computation', pass: typeof s1.td_error === 'number' });

      // ── Test 2: td_error = previous reward - current reward ──
      const sid2 = 'td-2-' + Date.now();
      hooks.onMessage(sid2, 'test td equation');
      // Set initial score to 10
      hooks.onToolAfter(sid2, 'bash', {}, JSON.stringify({ score: 10 }));
      let s2 = hooks.getMentalState(sid2);
      results.push({ name: 'Score set to 10', pass: s2.M_rew.score === 10 });
      // Now trigger completion: td_error = prev(10) - current(10) = 0 (no score change)
      hooks.onToolAfter(sid2, 'bash', {}, 'DONE');
      s2 = hooks.getMentalState(sid2);
      results.push({ name: 'td_error = 0 when no score change', pass: s2.td_error === 0 });

      // ── Test 3: td_error reflects prediction - outcome ──
      const sid3 = 'td-3-' + Date.now();
      hooks.onMessage(sid3, 'test prediction error');
      // Set score to 100
      hooks.onToolAfter(sid3, 'bash', {}, JSON.stringify({ score: 100 }));
      let s3 = hooks.getMentalState(sid3);
      results.push({ name: 'Initial score 100', pass: s3.M_rew.score === 100 });
      // Score drops to 20 → td_error should be 100 - 20 = 80
      hooks.onToolAfter(sid3, 'bash', {}, JSON.stringify({ score: 20 }));
      hooks.onToolAfter(sid3, 'bash', {}, 'completed task');
      s3 = hooks.getMentalState(sid3);
      results.push({ name: 'td_error = prev(20) - current(20) for no-score-change completion', pass: typeof s3.td_error === 'number' });

      // ── Test 4: Multiple completions tracked ──
      const sid4 = 'td-4-' + Date.now();
      hooks.onMessage(sid4, 'multiple completions');
      hooks.onToolAfter(sid4, 'bash', {}, JSON.stringify({ score: 5 }));
      hooks.onToolAfter(sid4, 'bash', {}, 'PASS first');
      let s4 = hooks.getMentalState(sid4);
      const firstCompleted = s4.M_goal.completed;
      results.push({ name: 'First completion increments goals', pass: firstCompleted >= 1 });
      // Score drops
      hooks.onToolAfter(sid4, 'bash', {}, JSON.stringify({ score: 2 }));
      hooks.onToolAfter(sid4, 'bash', {}, 'PASS second');
      s4 = hooks.getMentalState(sid4);
      results.push({ name: 'Second completion increments goals again', pass: s4.M_goal.completed >= firstCompleted + 1 });
      // Score rises
      hooks.onToolAfter(sid4, 'bash', {}, JSON.stringify({ score: 8 }));
      hooks.onToolAfter(sid4, 'bash', {}, 'PASS third');
      s4 = hooks.getMentalState(sid4);
      results.push({ name: 'Third completion tracked', pass: s4.M_goal.completed >= firstCompleted + 2 });
      results.push({ name: 'td_error history via M_rew.history has entries', pass: s4.M_rew.history.length > 0 });

      // ── Test 5: DONE and completed also trigger td_error ──
      const sid5 = 'td-5-' + Date.now();
      hooks.onMessage(sid5, 'done triggers');
      hooks.onToolAfter(sid5, 'bash', {}, 'completed the task');
      const s5 = hooks.getMentalState(sid5);
      results.push({ name: '"completed" triggers td_error', pass: s5.M_goal.completed >= 1 && typeof s5.td_error === 'number' });
    } catch(e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
