module.exports = {
  name: 'C7: memory (real)',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];

    const sid = 'c7r-' + Date.now();
    hooks.onMessage(sid, 'test memory');
    var s0 = hooks.getMentalState(sid);
    R.push({ n: 'initial l1.size is 0', p: s0 && s0.l1 && s0.l1.size === 0 });

    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL","confidence":0.5,"score":4}');
    var s1 = hooks.getMentalState(sid);
    R.push({ n: 'onToolAfter with brain-thalamus adds to l1', p: s1 && s1.l1 && s1.l1.has('brain-thalamus') });
    R.push({ n: 'onToolAfter with score field updates M_rew.score', p: s1 && s1.M_rew && s1.M_rew.score === 4 });

    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed task');
    var s2 = hooks.getMentalState(sid);
    R.push({ n: 'PASS output increments M_goal.completed', p: s2 && s2.M_goal && s2.M_goal.completed > 0 });

    hooks.onToolAfter(sid, 'bash', {}, 'DONE');
    var s3 = hooks.getMentalState(sid);
    R.push({ n: 'DONE output increments M_goal.completed again', p: s3 && s3.M_goal && s3.M_goal.completed >= 2 });

    hooks.onToolAfter(sid, 'bash', {}, 'completed');
    var s4 = hooks.getMentalState(sid);
    R.push({ n: 'completed keyword also increments', p: s4 && s4.M_goal && s4.M_goal.completed >= 3 });

    var sidA = 'c7r-A-' + Date.now();
    var sidB = 'c7r-B-' + Date.now();
    hooks.onMessage(sidA, 'session A');
    hooks.onMessage(sidB, 'session B');
    hooks.onToolAfter(sidA, 'task', { category: 'brain-thalamus' }, '{"score":10}');
    hooks.onToolAfter(sidB, 'task', { category: 'brain-amygdala' }, '{"mode":"URGENT","confidence":0.9}');
    var stA = hooks.getMentalState(sidA);
    var stB = hooks.getMentalState(sidB);
    R.push({ n: 'session isolation — sidA has score=10', p: stA && stA.M_rew && stA.M_rew.score === 10 });
    R.push({ n: 'session isolation — sidB unaffected', p: stB && stB.M_rew && stB.M_rew.score === 0 });
    R.push({ n: 'session isolation — sidB has URGENT', p: stB && stB.M_emo && stB.M_emo.mode === 'URGENT' });
    R.push({ n: 'session isolation — sidA unaffected mood', p: stA && stA.M_emo && stA.M_emo.mode === 'NORMAL' });

    var sig = hooks.getStrongestSignal(sid);
    R.push({ n: 'getStrongestSignal returns array', p: Array.isArray(sig) });

    var summary = hooks.getSignalSummary(sid);
    R.push({ n: 'getSignalSummary returns string', p: typeof summary === 'string' });

    var wm = hooks.getWorkingMemory(sid);
    R.push({ n: 'getWorkingMemory returns object', p: typeof wm === 'object' && wm !== null });

    var trace = hooks.BrainTracer.export(sid);
    R.push({ n: 'BrainTracer has events', p: trace.length > 0 });

    var passed = R.every(function(r) { return r.p; });
    return { passed: passed, message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
