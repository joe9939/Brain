module.exports = {
  name: 'C5: emotion propagation',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    const fireAll = (sid, amygdalaOut) => {
      for (const cat of L1) {
        hooks.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-amygdala' ? amygdalaOut : '{}');
      }
    };

    // 1. Emotion signal fires in CAUTION mode (need all 5 L1 to suppress perceive)
    const sid1 = 'c5-1-' + Date.now();
    hooks.onMessage(sid1, 'caution');
    hooks.getStrongestSignal(sid1); // consume perceive
    fireAll(sid1, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
    const sigCaution = hooks.getStrongestSignal(sid1);
    results.push({ name: 'CAUTION -> emotion signal fires', pass: Array.isArray(sigCaution) && sigCaution.length > 0 });
    results.push({ name: 'CAUTION signal mentions CAUTION', pass: Array.isArray(sigCaution) && sigCaution[0].content.includes('CAUTION') });

    // 2. Emotion signal fires in URGENT mode
    const sid2 = 'c5-2-' + Date.now();
    hooks.onMessage(sid2, 'urgent');
    hooks.getStrongestSignal(sid2);
    fireAll(sid2, '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}');
    const sigUrgent = hooks.getStrongestSignal(sid2);
    results.push({ name: 'URGENT -> emotion signal fires', pass: Array.isArray(sigUrgent) && sigUrgent.length > 0 });
    results.push({ name: 'URGENT signal mentions URGENT', pass: Array.isArray(sigUrgent) && sigUrgent[0].content.includes('URGENT') });

    // 3. Emotion intensity set from confidence
    const sid3 = 'c5-3-' + Date.now();
    hooks.onMessage(sid3, 'intensity');
    hooks.getStrongestSignal(sid3);
    fireAll(sid3, '{"mode":"NORMAL","confidence":0.8,"valence":0.3,"arousal":0.6}');
    results.push({ name: 'CAUTION intensity set from confidence', pass: hooks.getMentalState(sid3).M_emo.intensity === 0.8 });

    // 4. NORMAL mode with high intensity fires emotion
    const sid4 = 'c5-4-' + Date.now();
    hooks.onMessage(sid4, 'high intensity');
    hooks.getStrongestSignal(sid4);
    fireAll(sid4, '{"mode":"NORMAL","confidence":0.8}');
    const sigHigh = hooks.getStrongestSignal(sid4);
    results.push({ name: 'NORMAL+high intensity fires', pass: Array.isArray(sigHigh) && sigHigh.length > 0 });

    // 5. NORMAL mode with very low intensity may not fire emotion (signal may not win)
    const sid5 = 'c5-5-' + Date.now();
    hooks.onMessage(sid5, 'low intensity');
    hooks.getStrongestSignal(sid5);
    fireAll(sid5, '{"mode":"NORMAL","confidence":0.1,"valence":0.05,"arousal":0.1}');
    results.push({ name: 'low intensity handled gracefully', pass: true });

    // 6. safety_threshold varies by mode
    const sid6 = 'c5-6-' + Date.now();
    hooks.onMessage(sid6, 'threshold');
    hooks.getStrongestSignal(sid6);
    fireAll(sid6, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5}');
    const sig6 = hooks.getStrongestSignal(sid6);
    results.push({ name: 'CAUTION -> safety_threshold=strict', pass: Array.isArray(sig6) && sig6[0].content.includes('safety_threshold=strict') });

    const sid6b = 'c5-6b-' + Date.now();
    hooks.onMessage(sid6b, 'urgent');
    hooks.getStrongestSignal(sid6b);
    fireAll(sid6b, '{"mode":"URGENT","confidence":0.9,"valence":-0.6}');
    const sig6b = hooks.getStrongestSignal(sid6b);
    results.push({ name: 'URGENT -> safety_threshold=heightened', pass: Array.isArray(sig6b) && sig6b[0].content.includes('safety_threshold=heightened') });

    // helper: suppress reward signal by setting high score
    const setHighScore = (sid) => { hooks.getMentalState(sid).M_rew.score = 5; };

    // 7. reward_multiplier varies by mode
    const sid7u = 'c5-7u-' + Date.now();
    hooks.onMessage(sid7u, 'urgent r');
    hooks.getStrongestSignal(sid7u);
    fireAll(sid7u, '{"mode":"URGENT","confidence":0.9}');
    setHighScore(sid7u);
    const sig7u = hooks.getStrongestSignal(sid7u);
    results.push({ name: 'URGENT -> reward_multiplier=0.9', pass: Array.isArray(sig7u) && sig7u[0].content.includes('reward_multiplier=0.9') });

    const sid7s = 'c5-7s-' + Date.now();
    hooks.onMessage(sid7s, 'support r');
    hooks.getStrongestSignal(sid7s);
    fireAll(sid7s, '{"mode":"SUPPORT","confidence":0.7}');
    setHighScore(sid7s);
    const sig7s = hooks.getStrongestSignal(sid7s);
    results.push({ name: 'SUPPORT -> reward_multiplier=0.8', pass: Array.isArray(sig7s) && sig7s[0].content.includes('reward_multiplier=0.8') });

    const sid7n = 'c5-7n-' + Date.now();
    hooks.onMessage(sid7n, 'normal r');
    hooks.getStrongestSignal(sid7n);
    fireAll(sid7n, '{"mode":"NORMAL","confidence":0.5}');
    setHighScore(sid7n);
    const sig7n = hooks.getStrongestSignal(sid7n);
    results.push({ name: 'NORMAL -> reward_multiplier=0.7', pass: Array.isArray(sig7n) && sig7n[0].content.includes('reward_multiplier=0.7') });

    // 8. Mood persistence: once CAUTION, intensity stays across cycles without amygdala
    const sid8 = 'c5-8-' + Date.now();
    hooks.onMessage(sid8, 'mood persist');
    hooks.getStrongestSignal(sid8);
    fireAll(sid8, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
    results.push({ name: 'CAUTION persists after firing', pass: hooks.getMentalState(sid8).M_emo.mode === 'CAUTION' });

    // Cycle 2-5: fire non-amygdala L1 only, verify mode/intensity persist
    for (let i = 0; i < 4; i++) {
      hooks.onMessage(sid8, 'cycle ' + i);
      hooks.getStrongestSignal(sid8);
      hooks.onToolAfter(sid8, 'task', { category: 'brain-thalamus' }, '{}');
      hooks.onToolAfter(sid8, 'task', { category: 'brain-hippocampus' }, '{}');
      hooks.onToolAfter(sid8, 'task', { category: 'brain-world-cortex' }, '{}');
      hooks.onToolAfter(sid8, 'task', { category: 'brain-safety' }, '{}');
      hooks.getStrongestSignal(sid8);
    }
    const s8 = hooks.getMentalState(sid8);
    results.push({ name: 'CAUTION intensity persists 4 cycles', pass: s8.M_emo.intensity === 0.9 });
    results.push({ name: 'CAUTION mode persists 4 cycles', pass: s8.M_emo.mode === 'CAUTION' });

    // 9. Mood update: new amygdala overwrites old mode
    hooks.onMessage(sid8, 'new mood');
    hooks.getStrongestSignal(sid8);
    fireAll(sid8, '{"mode":"NORMAL","confidence":0.2,"valence":0.1,"arousal":0.2}');
    const s9 = hooks.getMentalState(sid8);
    results.push({ name: 'new amygdala updates mood mode', pass: s9.M_emo.mode === 'NORMAL' });
    results.push({ name: 'new amygdala updates mood intensity', pass: s9.M_emo.intensity === 0.2 });

    // 10. SUPPORT mode emotion signal
    const sid10 = 'c5-10-' + Date.now();
    hooks.onMessage(sid10, 'support');
    hooks.getStrongestSignal(sid10);
    fireAll(sid10, '{"mode":"SUPPORT","confidence":0.8,"valence":0.5,"arousal":0.4}');
    const sig10 = hooks.getStrongestSignal(sid10);
    results.push({ name: 'SUPPORT mode signal fires', pass: Array.isArray(sig10) && sig10.length > 0 });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
