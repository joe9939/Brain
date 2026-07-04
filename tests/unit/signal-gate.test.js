module.exports = {
  name: 'UNIT: Signal Gate',
  run: async () => {
    const h = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'gate-' + Date.now();

    // 1. Perceive wins (L1 empty) → only task() + read allowed
    h.onMessage(sid, 'test gate');
    const gate1 = h.getSignalGate(sid);
    R.push({ n: 'perceive → task allowed', p: !gate1.allowAll && gate1.allowedTools.includes('task') });
    R.push({ n: 'perceive → bash blocked', p: !gate1.allowAll && !gate1.allowedTools.includes('bash') });

    // 2. Complete L1 + set score≥3 → reward satisfied → gate opens
    const l1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const cat of l1) h.onToolAfter(sid, 'task', { category: cat }, '{}');
    // Set score ≥ 3 via thalamus output
    h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"gate":"PASS","score":5}');
    h.getStrongestSignal(sid); // consume perceive
    const gate2 = h.getSignalGate(sid);
    R.push({ n: 'L1 done+scoreOK → allowAll', p: gate2.allowAll });

    // 3. CAUTION mode → safety gate restricts to read+task
    const sid2 = 'gate-caution-' + Date.now();
    h.onMessage(sid2, 'caution');
    h.getStrongestSignal(sid2);
    for (const cat of l1) {
      const out = cat === 'brain-amygdala' ? '{"mode":"CAUTION","confidence":0.9}' : '{}';
      h.onToolAfter(sid2, 'task', { category: cat }, out);
    }
    const gate3 = h.getSignalGate(sid2);
    R.push({ n: 'caution → read allowed', p: !gate3.allowAll && gate3.allowedTools.includes('task') });
    R.push({ n: 'caution → edit blocked', p: !gate3.allowAll && !gate3.allowedTools.includes('write') });

    // 4. Reward low score (score < 3) → restrict (reasoning mode)
    const sid3 = 'gate-reward-' + Date.now();
    h.onMessage(sid3, 'low score');
    h.getStrongestSignal(sid3);
    for (const cat of l1) {
      const out = cat === 'brain-thalamus' ? '{"score":2}' : '{}';
      h.onToolAfter(sid3, 'task', { category: cat }, out);
    }
    const gate4 = h.getSignalGate(sid3);
    R.push({ n: 'low score → gate restricts', p: !gate4.allowAll });

    // 5. Normal (score≥3, NORMAL emotion, L1 done) → allowAll
    const sid4 = 'gate-normal-' + Date.now();
    h.onMessage(sid4, 'normal');
    h.getStrongestSignal(sid4);
    for (const cat of l1) {
      const out = cat === 'brain-amygdala' ? '{"mode":"NORMAL","confidence":0.1}' : cat === 'brain-thalamus' ? '{"score":5}' : '{}';
      h.onToolAfter(sid4, 'task', { category: cat }, out);
    }
    const gate5 = h.getSignalGate(sid4);
    R.push({ n: 'normal mode → allowAll', p: gate5.allowAll });

    return { passed: R.every(r => r.p), message: R.map(r => (r.p?'PASS':'FAIL')+' '+r.n).join('\n'), time_ms: 0 };
  },
};
