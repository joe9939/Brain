module.exports = {
  name: 'PLUGIN: Mood Decay',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 1. Default mood state after onMessage
      {
        const sid = 'md1-' + Date.now();
        h.onMessage(sid, 'test');
        const s = h.getMentalState(sid);
        results.push({ name: 'Default mode is NORMAL', pass: s.M_emo.mode === 'NORMAL' });
        results.push({ name: 'Default intensity is 0.1', pass: s.M_emo.intensity === 0.1 });
      }

      // 2. L1 amygdala output sets mood mode + intensity
      {
        const sid = 'md2-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.85,"valence":-0.5,"arousal":0.8}');
        const s = h.getMentalState(sid);
        results.push({ name: 'Amygdala sets CAUTION mode', pass: s.M_emo.mode === 'CAUTION' });
        results.push({ name: 'Amygdala sets intensity from confidence', pass: s.M_emo.intensity === 0.85 });
      }

      // 3. URGENT mode sets proper valence and arousal
      {
        const sid = 'md3-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"URGENT","confidence":0.9}');
        const s = h.getMentalState(sid);
        results.push({ name: 'URGENT mode valence defaults to -0.6', pass: s.M_emo.valence === -0.6 });
        results.push({ name: 'URGENT mode arousal defaults to 0.9', pass: s.M_emo.arousal === 0.9 });
      }

      // 4. NORMAL mode valence defaults to 0.1
      {
        const sid = 'md4-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.5}');
        const s = h.getMentalState(sid);
        results.push({ name: 'NORMAL mode valence defaults to 0.1', pass: s.M_emo.valence === 0.1 });
      }

      // 5. Emotion signal instruction includes mode/intensity
      {
        const sid = 'md5-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
        for (const cat of L1) {
          h.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-amygdala' ? '{"mode":"CAUTION","confidence":0.9}' : '{}');
        }
        h.getMentalState(sid).M_rew.score = 5; // avoid reward signal
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'CAUTION emotion signal includes mode info',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('CAUTION') && m.content?.includes('0.9')),
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
