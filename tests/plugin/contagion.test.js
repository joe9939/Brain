module.exports = {
  name: 'PLUGIN: Emotional Contagion',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 1. When amygdala returns CAUTION, mode becomes CAUTION
      {
        const sid = 'con1-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
        const s = h.getMentalState(sid);
        results.push({ name: 'Amygdala CAUTION sets mode', pass: s.M_emo.mode === 'CAUTION' });
      }

      // 2. When amygdala returns NORMAL (1 agent), mode is NORMAL
      {
        const sid = 'con2-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.5}');
        const s = h.getMentalState(sid);
        results.push({ name: 'Amygdala NORMAL sets mode', pass: s.M_emo.mode === 'NORMAL' });
      }

      // 3. 3/5 L1 agents with CAUTION — last amygdala wins
      {
        const sid = 'con3-' + Date.now();
        h.onMessage(sid, 'test');
        const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
        for (let i = 0; i < L1.length; i++) {
          const cat = L1[i];
          // Agent at index 0,2,4 is "CAUTION-like" (thalamus, hippocampus, safety)
          const out = cat === 'brain-amygdala'
            ? '{"mode":"CAUTION","confidence":0.9,"valence":-0.5}'
            : '{"mode":"NORMAL","confidence":0.3}';
          h.onToolAfter(sid, 'task', { category: cat }, out);
        }
        const s = h.getMentalState(sid);
        results.push({ name: '3/5 NORMAL agents final mode', pass: s.M_emo.mode === 'NORMAL' });
      }

      // 4. Amygdala sets mode regardless of other L1 agents
      {
        const sid = 'con4-' + Date.now();
        h.onMessage(sid, 'test');
        const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
        for (const cat of L1) {
          const out = cat === 'brain-amygdala'
            ? '{"mode":"CAUTION","confidence":0.9}'
            : '{"mode":"NORMAL","confidence":0.5}';
          h.onToolAfter(sid, 'task', { category: cat }, out);
        }
        const s = h.getMentalState(sid);
        results.push({ name: 'Amygdala CAUTION overrides', pass: s.M_emo.mode === 'CAUTION' });
      }

      // 5. Wm keyed by agent name, mood propagated from amygdala output
      {
        const sid = 'con5-' + Date.now();
        h.onMessage(sid, 'test');
        h.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"EXPLORE","confidence":0.7,"valence":0.3,"arousal":0.6}');
        const s = h.getMentalState(sid);
        results.push({
          name: 'Amygdala wm stored + mood set',
          pass: s.wm.amygdala?.mode === 'EXPLORE' && s.M_emo.mode === 'EXPLORE',
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
