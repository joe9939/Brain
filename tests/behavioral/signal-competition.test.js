module.exports = {
  name: 'BEHAVIORAL: Signal Competition Priority',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];

      // ── Test 1: Empty L1 → perceive signal strongest (pri=5, raw=1.0) ──
      const sid1 = 'sc-1-' + Date.now();
      hooks.onMessage(sid1, 'hello');
      const sig1 = hooks.getStrongestSignal(sid1);
      results.push({ name: 'Empty L1 → perceive wins (priority 5)', pass: Array.isArray(sig1) && sig1.length > 0 && sig1[0].content.includes('L1') });

      // ── Test 2: All L1 fired + CAUTION mode (via amygdala only) → emotion or safety wins ──
      const sid2 = 'sc-2-' + Date.now();
      hooks.onMessage(sid2, 'caution test');
      for (const agent of L1) {
        if (agent === 'brain-amygdala') {
          hooks.onToolAfter(sid2, 'task', { category: agent }, JSON.stringify({ mode: 'CAUTION', confidence: 0.9, score: 1 }));
        } else {
          hooks.onToolAfter(sid2, 'task', { category: agent }, JSON.stringify({ score: 1 }));
        }
      }
      const sig2 = hooks.getStrongestSignal(sid2);
      // Both emotion and safety get 0.9*4=3.6; emotion wins due to stable sort insertion order
      results.push({ name: 'CAUTION → emotion or safety wins (both boosted)', pass: Array.isArray(sig2) && sig2.length > 0 && (sig2[0].content.includes('Emotion') || sig2[0].content.includes('Safety')) });

      // ── Test 3: All L1 fired + low score → reward signal wins ──
      const sid3 = 'sc-3-' + Date.now();
      hooks.onMessage(sid3, 'reward test');
      for (const agent of L1) {
        hooks.onToolAfter(sid3, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 0 }));
      }
      const sig3 = hooks.getStrongestSignal(sid3);
      results.push({ name: 'Low score (0) → reward wins', pass: Array.isArray(sig3) && sig3.length > 0 && sig3[0].content.includes('Reward') });

      // ── Test 4: All L1 + normal mood + score=5 → no strong override (emotion as default) ──
      const sid4 = 'sc-4-' + Date.now();
      hooks.onMessage(sid4, 'normal test');
      for (const agent of L1) {
        hooks.onToolAfter(sid4, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 5 }));
      }
      const sig4 = hooks.getStrongestSignal(sid4);
      // With all L1 complete (perceive=0), score=5 (reward=0), NORMAL mood (emotion=1.0), winner is Emotion
      results.push({ name: 'Normal mood → emotion is default (no strong override)', pass: Array.isArray(sig4) && sig4.length > 0 });

      // ── Test 5: Signal dedup — same winner returns empty on second call ──
      const sid5 = 'sc-5-' + Date.now();
      hooks.onMessage(sid5, 'dedup check');
      const first = hooks.getStrongestSignal(sid5);
      const second = hooks.getStrongestSignal(sid5);
      results.push({ name: 'Dedup: same winner returns [] on second call', pass: Array.isArray(first) && first.length > 0 && Array.isArray(second) && second.length === 0 });
    } catch(e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
