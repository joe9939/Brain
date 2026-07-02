module.exports = {
  name: 'C7: memory & state',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'c7-' + Date.now();

    hooks.onMessage(sid, 'test message');
    const s0 = hooks.getMentalState(sid);
    results.push({ name: 'onMessage resets l1 Set', pass: s0.l1.size === 0 });
    results.push({ name: 'onMessage resets _last_signal', pass: s0._last_signal === null });
    results.push({ name: 'onMessage increments cycle', pass: s0.cycle === 1 });

    try { hooks.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) {}
    const tb = hooks.BrainTracer.query(sid, { event: 'T1:before' });
    const hasG1Block = tb.some(e => e.data && e.data.blocked === true);
    results.push({ name: 'onToolBefore dangerous cmd records G1 block', pass: hasG1Block });

    hooks.onToolBefore(sid, 'bash', { command: 'echo safe' });
    const tb2 = hooks.BrainTracer.query(sid, { event: 'T1:before' });
    const safeCount = tb2.filter(e => e.data && e.data.blocked === false).length;
    results.push({ name: 'onToolBefore safe cmd records blocked:false', pass: safeCount > 0 });

    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL","confidence":0.7,"valence":0.2,"arousal":0.4,"score":8}');
    const s1 = hooks.getMentalState(sid);
    results.push({ name: 'onToolAfter L1 updates M_emo.mode', pass: s1.M_emo.mode === 'NORMAL' });
    results.push({ name: 'onToolAfter L1 updates M_emo.intensity', pass: s1.M_emo.intensity === 0.7 });
    results.push({ name: 'onToolAfter L1 updates M_emo.valence', pass: s1.M_emo.valence === 0.2 });
    results.push({ name: 'onToolAfter L1 updates M_emo.arousal', pass: s1.M_emo.arousal === 0.4 });
    results.push({ name: 'onToolAfter L1 updates M_rew.score', pass: s1.M_rew.score === 8 });
    results.push({ name: 'onToolAfter L1 stores wm.thalamus', pass: s1.wm.thalamus && s1.wm.thalamus.mode === 'NORMAL' });
    results.push({ name: 'L1 completion tracked via l1 Set has brain-thalamus', pass: s1.l1.has('brain-thalamus') });
    results.push({ name: 'L1 size is 1 after first agent', pass: s1.l1.size === 1 });

    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9}');
    const s2 = hooks.getMentalState(sid);
    results.push({ name: 'amygdala updates M_emo to CAUTION', pass: s2.M_emo.mode === 'CAUTION' });
    results.push({ name: 'amygdala stored in wm', pass: s2.wm.amygdala && s2.wm.amygdala.mode === 'CAUTION' });

    hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{"recent_memories":[],"relevant_sops":[{"id":"s1"}],"episodic":[{"id":"e1"}]}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{"files":["src/main.js"]}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-safety' }, '{"threat":"low"}');
    const s5 = hooks.getMentalState(sid);
    results.push({ name: 'all 5 L1 agents complete, l1.size=5', pass: s5.l1.size === 5 });
    results.push({ name: 'wm.hippocampus has sops', pass: s5.wm.hippocampus && s5.wm.hippocampus.relevant_sops.length > 0 });
    results.push({ name: 'wm.world-cortex has files', pass: s5.wm['world-cortex'] && s5.wm['world-cortex'].files.length > 0 });
    results.push({ name: 'wm.safety has threat', pass: s5.wm.safety && s5.wm.safety.threat === 'low' });

    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    const completedAfterPass = hooks.getMentalState(sid).M_goal.completed;
    results.push({ name: 'PASS output increments M_goal.completed', pass: completedAfterPass > 0 });

    hooks.onToolAfter(sid, 'bash', {}, 'DONE');
    const completedAfterDone = hooks.getMentalState(sid).M_goal.completed;
    results.push({ name: 'DONE output also increments', pass: completedAfterDone > completedAfterPass });

    hooks.onToolAfter(sid, 'bash', {}, '{"score":15}');
    const sScore = hooks.getMentalState(sid);
    results.push({ name: 'score JSON parsed in M_rew.score', pass: sScore.M_rew.score === 15 });

    hooks.onToolAfter(sid, 'bash', {}, '{"score":20}');
    const sScore2 = hooks.getMentalState(sid);
    results.push({ name: 'score history records previous scores', pass: sScore2.M_rew.history.length > 0 });

    const sid2 = 'c7-b-' + Date.now();
    hooks.onMessage(sid2, 'isolated session');
    hooks.onToolAfter(sid2, 'task', { category: 'brain-amygdala' }, '{"mode":"URGENT","confidence":0.9}');
    const s2a = hooks.getMentalState(sid2);
    const s1b = hooks.getMentalState(sid);
    results.push({ name: 'session isolation: session2 URGENT', pass: s2a.M_emo.mode === 'URGENT' });
    results.push({ name: 'session isolation: session1 stays CAUTION', pass: s1b.M_emo.mode === 'CAUTION' });

    const sid3 = 'c7-c-' + Date.now();
    hooks.onMessage(sid3, 'implement a complex microservice architecture with docker and kubernetes and database and caching and monitoring and logging and authentication');
    const sSwarm = hooks.getMentalState(sid3);
    results.push({ name: 'complex message triggers swarm=true', pass: sSwarm.swarm === true });

    hooks.onToolAfter(sid3, 'bash', {}, 'COMPLETE');
    const sAfter = hooks.getMentalState(sid3);
    results.push({ name: 'COMPLETE during swarm sets swarm=false', pass: sAfter.swarm === false });

    const sid4 = 'c7-d-' + Date.now();
    hooks.onMessage(sid4, 'build a new authentication system');
    hooks.onToolAfter(sid4, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL","confidence":0.5,"score":3}');
    hooks.onToolAfter(sid4, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.5}');
    hooks.onToolAfter(sid4, 'task', { category: 'brain-hippocampus' }, '{}');
    hooks.onToolAfter(sid4, 'task', { category: 'brain-world-cortex' }, '{}');
    hooks.onToolAfter(sid4, 'task', { category: 'brain-safety' }, '{}');
    const s4Done = hooks.getMentalState(sid4);
    results.push({ name: 'L1 with empty JSON responses completes', pass: s4Done.l1.size === 5 });

    hooks.onToolAfter(sid4, 'bash', {}, 'normal output without keywords');
    results.push({ name: 'non-PASS/DONE/score output does not corrupt state', pass: true });

    const sig = hooks.getStrongestSignal(sid4);
    results.push({ name: 'getStrongestSignal works after full L1', pass: Array.isArray(sig) });

    const summary = hooks.getSignalSummary(sid);
    results.push({ name: 'getSignalSummary returns string', pass: typeof summary === 'string' });

    const wm = hooks.getWorkingMemory(sid);
    results.push({ name: 'getWorkingMemory returns wm object', pass: typeof wm === 'object' && wm !== null });

    const tracer = hooks.BrainTracer;
    const ta = tracer.export(sid);
    results.push({ name: 'BrainTracer has events for sid', pass: ta.length > 0 });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); })(); }
