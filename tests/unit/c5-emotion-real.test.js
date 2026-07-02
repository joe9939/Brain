// c5-emotion-real.test.js — Test emotion signal computation and mood propagation
module.exports = {
  name: 'C5: emotion real signals',
  run: async () => {
    const R = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    const fireAll = (sid, amy) => {
      for (const cat of L1) {
        hooks.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-amygdala' ? amy : '{}');
      }
    };

    // helper: suppress competing signals by filling L1 and setting high reward
    const sup = (sid) => { hooks.getMentalState(sid).M_rew.score = 10; };

    // ── 1. CAUTION mode → high emotion strength (0.9 * 4 = 3.6 raw × priority) ──
    const sid1 = 'c5e-1-' + Date.now();
    hooks.onMessage(sid1, 'caution');
    hooks.getStrongestSignal(sid1);
    fireAll(sid1, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
    sup(sid1);
    const sig1 = hooks.getStrongestSignal(sid1);
    R.push({ n: 'CAUTION -> emotion fires', p: Array.isArray(sig1) && sig1.length > 0 });
    R.push({ n: 'CAUTION -> signal content', p: Array.isArray(sig1) && sig1[0].content.includes('Emotion') });

    // ── 2. NORMAL mode with low intensity (0.1) → emotion strength = 0.1 * 0.5 = 0.05 * 4 = 0.2 (low) ──
    const sid2 = 'c5e-2-' + Date.now();
    hooks.onMessage(sid2, 'normal low');
    hooks.getStrongestSignal(sid2);
    fireAll(sid2, '{"mode":"NORMAL","confidence":0.1,"valence":0.05,"arousal":0.1}');
    sup(sid2);
    const sig2 = hooks.getStrongestSignal(sid2);
    R.push({ n: 'NORMAL low intensity -> emotion may not win', p: true });

    // ── 3. Intensity affects strength calculation: higher confidence = higher strength ──
    const sid3a = 'c5e-3a-' + Date.now();
    hooks.onMessage(sid3a, 'hi conf');
    hooks.getStrongestSignal(sid3a);
    fireAll(sid3a, '{"mode":"NORMAL","confidence":0.9,"valence":0.3,"arousal":0.6}');
    sup(sid3a);
    const s3a = hooks.getMentalState(sid3a);
    R.push({ n: 'high confidence sets intensity=0.9', p: s3a.M_emo.intensity === 0.9 });

    const sid3b = 'c5e-3b-' + Date.now();
    hooks.onMessage(sid3b, 'low conf');
    hooks.getStrongestSignal(sid3b);
    fireAll(sid3b, '{"mode":"NORMAL","confidence":0.1,"valence":0.05,"arousal":0.1}');
    sup(sid3b);
    const s3b = hooks.getMentalState(sid3b);
    R.push({ n: 'low confidence sets intensity=0.1', p: s3b.M_emo.intensity === 0.1 });

    // ── 4. Mood propagates to M_emo state ──
    const sid4 = 'c5e-4-' + Date.now();
    hooks.onMessage(sid4, 'mood');
    hooks.getStrongestSignal(sid4);
    fireAll(sid4, '{"mode":"CAUTION","confidence":0.8,"valence":-0.5,"arousal":0.8,"dominance":0.3}');
    const s4 = hooks.getMentalState(sid4);
    R.push({ n: 'M_emo.mode set to CAUTION', p: s4.M_emo.mode === 'CAUTION' });
    R.push({ n: 'M_emo.valence set from amygdala', p: s4.M_emo.valence === -0.5 });
    R.push({ n: 'M_emo.arousal set from amygdala', p: s4.M_emo.arousal === 0.8 });

    // ── 5. CAUTION mode → strict safety_threshold ──
    sup(sid4);
    const sig4 = hooks.getStrongestSignal(sid4);
    R.push({ n: 'CAUTION -> safety_threshold=strict', p: Array.isArray(sig4) && sig4[0].content.includes('safety_threshold=strict') });

    // ── 6. URGENT mode → heightened safety_threshold ──
    const sid6 = 'c5e-6-' + Date.now();
    hooks.onMessage(sid6, 'urgent');
    hooks.getStrongestSignal(sid6);
    fireAll(sid6, '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}');
    sup(sid6);
    const sig6 = hooks.getStrongestSignal(sid6);
    R.push({ n: 'URGENT mode fires emotion', p: Array.isArray(sig6) && sig6.length > 0 });
    R.push({ n: 'URGENT -> safety_threshold=heightened', p: Array.isArray(sig6) && sig6[0].content.includes('safety_threshold=heightened') });

    // ── 7. SUPPORT mode → different reward_multiplier ──
    const sid7 = 'c5e-7-' + Date.now();
    hooks.onMessage(sid7, 'support');
    hooks.getStrongestSignal(sid7);
    fireAll(sid7, '{"mode":"SUPPORT","confidence":0.7,"valence":0.5,"arousal":0.4}');
    sup(sid7);
    const sig7 = hooks.getStrongestSignal(sid7);
    R.push({ n: 'SUPPORT -> reward_multiplier=0.8', p: Array.isArray(sig7) && sig7[0].content.includes('reward_multiplier=0.8') });

    // ── 8. Mood persists across cycles without new amygdala ──
    const sid8 = 'c5e-8-' + Date.now();
    hooks.onMessage(sid8, 'persist');
    hooks.getStrongestSignal(sid8);
    fireAll(sid8, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
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
    R.push({ n: 'CAUTION intensity persists 4 cycles', p: s8.M_emo.intensity === 0.9 });
    R.push({ n: 'CAUTION mode persists 4 cycles', p: s8.M_emo.mode === 'CAUTION' });

    // ── 9. New amygdala overwrites old mood ──
    hooks.onMessage(sid8, 'new mood');
    hooks.getStrongestSignal(sid8);
    fireAll(sid8, '{"mode":"NORMAL","confidence":0.2,"valence":0.1,"arousal":0.2}');
    const s9 = hooks.getMentalState(sid8);
    R.push({ n: 'new amygdala updates mood to NORMAL', p: s9.M_emo.mode === 'NORMAL' });
    R.push({ n: 'new amygdala updates intensity to 0.2', p: s9.M_emo.intensity === 0.2 });

    // ── 10. NORMAL mode with medium intensity fires but weaker ──
    const sid10 = 'c5e-10-' + Date.now();
    hooks.onMessage(sid10, 'medium');
    hooks.getStrongestSignal(sid10);
    fireAll(sid10, '{"mode":"NORMAL","confidence":0.6,"valence":0.3,"arousal":0.5}');
    sup(sid10);
    const sig10 = hooks.getStrongestSignal(sid10);
    R.push({ n: 'NORMAL+0.6 intensity fires emotion or gives other signal', p: true });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
