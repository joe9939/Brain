module.exports = {
  name: 'C2: signal competition',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'c2-' + Date.now();

    hooks.onMessage(sid, 'hello');
    const s0 = hooks.getMentalState(sid);
    results.push({ name: 'onMessage resets l1', pass: s0.l1.size === 0 });
    results.push({ name: 'onMessage resets _last_signal', pass: s0._last_signal === null });

    const unknownSid = 'c2-unknown-' + Date.now();
    const emptySig = hooks.getStrongestSignal(unknownSid);
    results.push({ name: 'getStrongestSignal unknown session returns []', pass: Array.isArray(emptySig) && emptySig.length === 0 });

    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL","confidence":0.8,"valence":0.1,"arousal":0.3,"score":5}');
    const s1 = hooks.getMentalState(sid);
    results.push({ name: 'onToolAfter updates l1 size', pass: s1.l1.size === 1 });
    results.push({ name: 'onToolAfter updates M_emo mode', pass: s1.M_emo.mode === 'NORMAL' });
    results.push({ name: 'onToolAfter updates M_emo intensity', pass: s1.M_emo.intensity === 0.8 });
    results.push({ name: 'onToolAfter updates M_rew score', pass: s1.M_rew.score === 5 });
    results.push({ name: 'onToolAfter stores wm entry', pass: s1.wm.thalamus && s1.wm.thalamus.mode === 'NORMAL' });

    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9}');
    const s2 = hooks.getMentalState(sid);
    results.push({ name: 'second L1 increments l1 to 2', pass: s2.l1.size === 2 });
    results.push({ name: 'second L1 updates M_emo', pass: s2.M_emo.mode === 'CAUTION' });
    results.push({ name: 'wm stores amygdala', pass: s2.wm.amygdala && s2.wm.amygdala.mode === 'CAUTION' });

    hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{"recent_memories":[],"relevant_sops":[{"id":"sop1"}]}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{"files":[]}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-safety' }, '{"threat":"none"}');
    const s5 = hooks.getMentalState(sid);
    results.push({ name: 'all 5 L1 complete', pass: s5.l1.size === 5 });
    results.push({ name: 'L1 complete tracked via Set', pass: s5.l1.has('brain-thalamus') && s5.l1.has('brain-safety') });

    const sig1 = hooks.getStrongestSignal(sid);
    results.push({ name: 'getStrongestSignal returns array', pass: Array.isArray(sig1) });
    results.push({ name: 'winner signal has role system', pass: sig1.length > 0 && sig1[0].role === 'system' });
    results.push({ name: 'winner signal has content', pass: sig1.length > 0 && typeof sig1[0].content === 'string' && sig1[0].content.length > 10 });
    results.push({ name: 'signal content mentions signal name', pass: sig1.length > 0 && /\[Brain:/.test(sig1[0].content) });

    const sig2 = hooks.getStrongestSignal(sid);
    results.push({ name: 'dedup: same winner returns [] on 2nd call', pass: Array.isArray(sig2) && sig2.length === 0 });

    const sid2 = 'c2-b-' + Date.now();
    hooks.onMessage(sid2, 'hello');
    const sigB = hooks.getStrongestSignal(sid2);
    results.push({ name: 'different session separate from sid', pass: hooks.getMentalState(sid).l1.size === 5 && hooks.getMentalState(sid2).l1.size === 0 });

    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed the task');
    const sAfter = hooks.getMentalState(sid);
    results.push({ name: 'onToolAfter PASS increments M_goal.completed', pass: sAfter.M_goal.completed > 0 });

    const sig3 = hooks.getStrongestSignal(sid);
    results.push({ name: 'signals recompute after state change', pass: Array.isArray(sig3) });

    const sAll = hooks.getMentalState(sid);
    results.push({ name: 'swarm stays false for simple message', pass: sAll.swarm === false });

    hooks.onMessage(sid, 'implement a new microservice architecture with kubernetes deployment and monitoring stack and database and caching layer');
    const sSwarm = hooks.getMentalState(sid);
    results.push({ name: 'complex message triggers swarm', pass: sSwarm.swarm === true });

    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}');
    const sUrgent = hooks.getMentalState(sid);
    results.push({ name: 'URGENT mode sets valence -0.6', pass: sUrgent.M_emo.valence === -0.6 });
    results.push({ name: 'URGENT mode sets arousal 0.9', pass: sUrgent.M_emo.arousal === 0.9 });

    const sig6 = hooks.getStrongestSignal(sid);
    results.push({ name: 'signals compute after swarm + URGENT', pass: Array.isArray(sig6) });

    const sid3 = 'c2-c-' + Date.now();
    for (let i = 0; i < 10; i++) {
      hooks.onMessage(sid3, 'msg ' + i);
      hooks.onToolAfter(sid3, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
      hooks.onToolAfter(sid3, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
      hooks.onToolAfter(sid3, 'task', { category: 'brain-hippocampus' }, JSON.stringify({ relevant_sops: [{ id: 's' + i }] }));
      hooks.onToolAfter(sid3, 'task', { category: 'brain-world-cortex' }, JSON.stringify({ files: [] }));
      hooks.onToolAfter(sid3, 'task', { category: 'brain-safety' }, JSON.stringify({ threat: 'none' }));
      hooks.onToolAfter(sid3, 'bash', {}, 'PASS');
      const sig = hooks.getStrongestSignal(sid3);
    }
    const sCycles = hooks.getMentalState(sid3);
    results.push({ name: 'cycle counter increments across messages', pass: sCycles.cycle === 10 });
    results.push({ name: '10 cycles L1 properly tracked', pass: sCycles.l1.size > 0 });
    results.push({ name: 'Reward history bounded at 100', pass: sCycles.M_rew.history.length <= 100 });

    const signalSummary = hooks.getSignalSummary(sid);
    results.push({ name: 'getSignalSummary returns string', pass: typeof signalSummary === 'string' });

    const wm = hooks.getWorkingMemory(sid);
    results.push({ name: 'getWorkingMemory returns object', pass: typeof wm === 'object' && wm !== null });

    hooks.onToolAfter(sid, 'bash', {}, '{"score":42}');
    const s42 = hooks.getMentalState(sid);
    results.push({ name: 'onToolAfter parses score JSON', pass: s42.M_rew.score === 42 });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); })(); }
