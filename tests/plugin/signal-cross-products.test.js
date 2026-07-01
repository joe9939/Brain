module.exports = {
  name: 'PLUGIN: Signal Cross-Products',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
      const fireL1 = (sid, overrides = {}) => {
        for (const cat of L1) {
          h.onToolAfter(sid, 'task', { category: cat }, overrides[cat] || '{}');
        }
      };

      // 1. CAUTION beats reward priority: emotion(4x0.9=3.6) > reward(3x0.8=2.4)
      {
        const sid = 'scp1-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid); // consume perceive
        fireL1(sid, { 'brain-amygdala': '{"mode":"CAUTION","confidence":0.9}' });
        h.getMentalState(sid).M_rew.score = 2; // low score triggers reward
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'CAUTION beats reward priority',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('CAUTION')),
        });
      }

      // 2. CAUTION + URGENT dual mode
      {
        const sid = 'scp2-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireL1(sid, { 'brain-amygdala': '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}' });
        h.getMentalState(sid).M_rew.score = 5; // avoid reward signal
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'URGENT emotion signal fires',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('URGENT')),
        });
      }

      // 3. URGENT + perceive conflict — perceive dominates when L1 empty
      {
        const sid = 'scp3-' + Date.now();
        h.onMessage(sid, 'test');
        const s = h.getMentalState(sid);
        s.M_emo.mode = 'URGENT';
        s.M_emo.intensity = 0.9;
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'Perceive beats URGENT when L1 empty',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('Parallel Perception')),
        });
      }

      // 4. Swarm + perceive — perceive beats action signal when L1 empty
      {
        const sid = 'scp4-' + Date.now();
        h.onMessage(sid, 'test');
        h.getMentalState(sid).swarm = true;
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'Perceive beats swarm when L1 empty',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('Parallel Perception')),
        });
      }

      // 5. Learning + perceive edge — learning fires after L1 complete + goals (set high score to avoid reward)
      {
        const sid = 'scp5-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireL1(sid);
        h.getMentalState(sid).M_rew.score = 5;
        h.onToolAfter(sid, 'bash', {}, 'PASS');
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'Learning signal fires after L1+goals',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('POST')),
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
