module.exports = {
  name: 'PLUGIN: Session Isolation',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var sid1 = 'isolation-1-' + Date.now();
      var sid2 = 'isolation-2-' + Date.now();

      // Initialize both sessions
      h.onMessage(sid1, 'session one');
      h.onMessage(sid2, 'session two');

      // Consume perceive signals
      h.getStrongestSignal(sid1);
      h.getStrongestSignal(sid2);

      // Ses1: set CAUTION mode via amygdala
      h.onToolAfter(sid1, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
      var s1 = h.getMentalState(sid1);
      var s2 = h.getMentalState(sid2);
      results.push({ name: 'Ses1 emotion is CAUTION', pass: s1 && s1.M_emo.mode === 'CAUTION' });
      results.push({ name: 'Ses2 emotion stays NORMAL', pass: s2 && s2.M_emo.mode === 'NORMAL' });

      // Ses1: set score=8 via thalamus
      h.onToolAfter(sid1, 'task', { category: 'brain-thalamus' }, '{"score":8,"gate":"PASS","urgency":0.3}');
      s1 = h.getMentalState(sid1);
      s2 = h.getMentalState(sid2);
      results.push({ name: 'Ses1 score updated to 8', pass: s1 && s1.M_rew.score === 8 });
      results.push({ name: 'Ses2 score unchanged (0)', pass: s2 && s2.M_rew.score === 0 });

      // Verify separate working memory
      results.push({ name: 'Ses1 has amygdala in working memory', pass: s1 && s1.wm && s1.wm.amygdala && s1.wm.amygdala.mode === 'CAUTION' });
      results.push({ name: 'Ses2 has no amygdala in working memory', pass: s2 && s2.wm && !s2.wm.amygdala });

      // Ses2 cycle should be independent
      h.onMessage(sid2, 'second message');
      s2 = h.getMentalState(sid2);
      s1 = h.getMentalState(sid1);
      results.push({ name: 'Ses2 cycle incremented independently', pass: s2 && s2.cycle === 2 });
      results.push({ name: 'Ses1 cycle unaffected by ses2 message', pass: s1 && s1.cycle === 1 });

      // 100 simultaneous sessions
      var bulkIds = [];
      for (var i = 0; i < 100; i++) {
        var bid = 'bulk-' + i + '-' + Date.now();
        h.onMessage(bid, 'bulk test ' + i);
        bulkIds.push(bid);
      }
      var allCyclesOne = true;
      var allNormal = true;
      for (var j = 0; j < 100; j++) {
        var bs = h.getMentalState(bulkIds[j]);
        if (!bs || bs.cycle !== 1) allCyclesOne = false;
        if (!bs || bs.M_emo.mode !== 'NORMAL') allNormal = false;
      }
      results.push({ name: '100 sessions: all have cycle=1', pass: allCyclesOne });
      results.push({ name: '100 sessions: all NORMAL mode', pass: allNormal });

      // Original sessions still intact after bulk creation
      var finalS1 = h.getMentalState(sid1);
      results.push({ name: 'Ses1 preserved after 100 sessions', pass: finalS1 && finalS1.M_rew.score === 8 && finalS1.M_emo.mode === 'CAUTION' });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
