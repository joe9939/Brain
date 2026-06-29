module.exports = {
  name: 'PLUGIN: Signal Competition',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const sid = 'sig-test-' + Date.now();

      // 1. onMessage -> getStrongestSignal returns perceive when L1 empty
      h.onMessage(sid, 'test message');
      const sig1 = h.getStrongestSignal(sid);
      results.push({
        name: 'Perceive signal when L1 empty',
        pass: Array.isArray(sig1) && sig1.some(m => m.content && m.content.includes('Parallel Perception')),
      });

      // 2. Dedup: second call returns empty for same signal
      const sigDedup = h.getStrongestSignal(sid);
      results.push({ name: 'Dedup: same signal not re-injected', pass: Array.isArray(sigDedup) && sigDedup.length === 0 });

      // 3. Fire 5 L1 agents -> signal changes
      const l1Cats = ['brain-thalamus', 'brain-amygdala', 'brain-hippocampus', 'brain-world-cortex', 'brain-safety'];
      for (const cat of l1Cats) {
        h.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-thalamus' ? '{"gate":"PASS"}' : '{}');
      }
      const sig2 = h.getStrongestSignal(sid);
      results.push({ name: 'Signal changes after 5 L1 agents', pass: Array.isArray(sig2) && sig2.length > 0 });

      // 4. CAUTION mode -> safety signal boosted
      const sid2 = 'sig-caution-' + Date.now();
      h.onMessage(sid2, 'test caution');
      h.getStrongestSignal(sid2); // consume perceive
      for (const cat of l1Cats) {
        const out = cat === 'brain-amygdala'
          ? '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}'
          : '{}';
        h.onToolAfter(sid2, 'task', { category: cat }, out);
      }
      const sigCaution = h.getStrongestSignal(sid2);
      results.push({
        name: 'CAUTION mode boosts emotion/safety signal',
        pass: Array.isArray(sigCaution) && sigCaution.some(m => m.content && m.content.includes('CAUTION')),
      });

      // 5. Low score -> reward signal boosted
      const sid3 = 'sig-low-' + Date.now();
      h.onMessage(sid3, 'test low score');
      h.getStrongestSignal(sid3); // consume perceive
      for (const cat of l1Cats) {
        const out = cat === 'brain-thalamus' ? '{"score":2}' : '{}';
        h.onToolAfter(sid3, 'task', { category: cat }, out);
      }
      const sigReward = h.getStrongestSignal(sid3);
      results.push({
        name: 'Low score boosts reward signal',
        pass: Array.isArray(sigReward) && sigReward.some(m => m.content && m.content.includes('Reward')),
      });

      // 6. Signal strengths differ between states (perceive vs post-L1)
      const ctx1 = h.getSignalContext ? h.getSignalContext(sid) : '';
      const ctx2 = h.getSignalContext ? h.getSignalContext(sid3) : '';
      results.push({ name: 'Signal strengths differ by state', pass: ctx1 !== ctx2 });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
