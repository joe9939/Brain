module.exports = {
  name: 'PLUGIN: Emotion Propagation',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
      const fireAll = (sid, amygdalaOut) => {
        for (const cat of L1) {
          h.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-amygdala' ? amygdalaOut : '{}');
        }
      };

      // Ensure reward signal doesn't dominate by setting high score
      const setHighScore = (sid) => { h.getMentalState(sid).M_rew.score = 5; };

      // 1. CAUTION mode → safety_threshold=strict
      {
        const sid = 'ep1-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireAll(sid, '{"mode":"CAUTION","confidence":0.9}');
        setHighScore(sid);
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'CAUTION → safety_threshold=strict',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('strict')),
        });
      }

      // 2. URGENT mode → reward_multiplier=0.9
      {
        const sid = 'ep2-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireAll(sid, '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}');
        setHighScore(sid);
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'URGENT → reward_multiplier=0.9',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('reward_multiplier=0.9')),
        });
      }

      // 3. SUPPORT mode → reward_multiplier=0.8
      {
        const sid = 'ep3-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireAll(sid, '{"mode":"SUPPORT","confidence":0.7}');
        setHighScore(sid);
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'SUPPORT → reward_multiplier=0.8',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('reward_multiplier=0.8')),
        });
      }

      // 4. NORMAL mode → reward_multiplier=0.7
      {
        const sid = 'ep4-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireAll(sid, '{"mode":"NORMAL","confidence":0.5}');
        setHighScore(sid);
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'NORMAL → reward_multiplier=0.7',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('reward_multiplier=0.7')),
        });
      }

      // 5. CAUTION mode → reward_multiplier=0.7
      {
        const sid = 'ep5-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireAll(sid, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
        setHighScore(sid);
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'CAUTION → reward_multiplier=0.7',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('reward_multiplier=0.7')),
        });
      }

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return { passed, message: passed ? 'All ' + results.length + ' checks passed' : 'Fail: ' + failed.join(', '), time_ms: Date.now() - start };
  },
};
