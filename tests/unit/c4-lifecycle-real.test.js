module.exports = {
  name: 'C4: lifecycle real hooks',
  run: async () => {
    const R = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'c4-' + Date.now();

    // ── T3: onMessage → cycle counter increments ──
    hooks.onMessage(sid, 'first message');
    R.push({ n: 'T3: onMessage cycle++ to 1', p: hooks.getMentalState(sid).cycle === 1 });
    R.push({ n: 'T3: onMessage sets lastEvent', p: hooks.getMentalState(sid).lastEvent > 0 });
    hooks.onMessage(sid, 'second');
    R.push({ n: 'T3: onMessage cycle++ to 2', p: hooks.getMentalState(sid).cycle === 2 });
    hooks.onMessage(sid, 'third');
    R.push({ n: 'T3: onMessage cycle++ to 3', p: hooks.getMentalState(sid).cycle === 3 });

    // ── T3: onMessage with complex text sets swarm ──
    const sidSwarm = 'c4-swarm-' + Date.now();
    hooks.onMessage(sidSwarm, 'implement a new microservice architecture with kubernetes deployment and monitoring stack and database and caching layer and message queue and api gateway');
    R.push({ n: 'T3: complex msg triggers swarm', p: hooks.getMentalState(sidSwarm).swarm === true });
    hooks.onMessage(sidSwarm, 'short msg');
    R.push({ n: 'T3: short msg keeps swarm (only COMPLETE/PASS resets)', p: hooks.getMentalState(sidSwarm).swarm === true });
    hooks.onToolAfter(sidSwarm, 'bash', {}, 'COMPLETE');
    R.push({ n: 'T3: COMPLETE in onToolAfter resets swarm', p: hooks.getMentalState(sidSwarm).swarm === false });

    // ── T1: onToolBefore → safety gate via BrainTracer ──
    hooks.onToolBefore(sid, 'bash', { command: 'echo hello' });
    const events = hooks.BrainTracer.query(sid, { event: 'T1:before' });
    R.push({ n: 'T1: BrainTracer has T1:before event', p: events.length > 0 });
    R.push({ n: 'T1: echo not blocked', p: events[events.length - 1].data.blocked === false });

    // ── T1: onToolBefore blocks rm -rf / ──
    let threw = false;
    try { hooks.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) { threw = true; }
    R.push({ n: 'T1: rm -rf / throws G1', p: threw });

    // ── T2: onToolAfter → M_t state updates ──
    const sidT2 = 'c4-t2-' + Date.now();
    hooks.onMessage(sidT2, 'tool after');
    hooks.onToolAfter(sidT2, 'task', { category: 'brain-thalamus' }, '{"mode":"NORMAL","score":3,"confidence":0.7}');
    R.push({ n: 'T2: l1 size becomes 1', p: hooks.getMentalState(sidT2).l1.size === 1 });
    R.push({ n: 'T2: wm.thalamus populated', p: hooks.getMentalState(sidT2).wm.thalamus?.mode === 'NORMAL' });
    R.push({ n: 'T2: M_emo.mode set from L1', p: hooks.getMentalState(sidT2).M_emo.mode === 'NORMAL' });
    R.push({ n: 'T2: M_rew.score set from L1', p: hooks.getMentalState(sidT2).M_rew.score === 3 });

    // ── Full T1→T2 sequence per tool (bash) ──
    const sidSeq = 'c4-seq-' + Date.now();
    hooks.onMessage(sidSeq, 'tool seq');
    // T1: before tool
    hooks.onToolBefore(sidSeq, 'bash', { command: 'echo hello' });
    // T2: after tool
    hooks.onToolAfter(sidSeq, 'bash', {}, 'Hello PASS');
    R.push({ n: 'T1→T2: cycle not changed by tools', p: hooks.getMentalState(sidSeq).cycle === 1 });
    R.push({ n: 'T1→T2: M_goal.completed from PASS', p: hooks.getMentalState(sidSeq).M_goal.completed >= 1 });
    R.push({ n: 'T1→T2: td_error computed', p: typeof hooks.getMentalState(sidSeq).td_error === 'number' });

    // ── T1→T2 for task tool (L1 agent) ──
    hooks.onToolBefore(sidSeq, 'task', {});
    hooks.onToolAfter(sidSeq, 'task', { category: 'brain-amygdala' }, '{}');
    R.push({ n: 'T1→T2: L1 task updates l1', p: hooks.getMentalState(sidSeq).l1.has('brain-amygdala') });

    // ── T4: onEvent → idle/error handled ──
    const sidT4 = 'c4-t4-' + Date.now();
    hooks.onMessage(sidT4, 't4 test');
    hooks.onEvent('session.idle', { sessionID: sidT4 });
    const idleEvents = hooks.BrainTracer.query(sidT4, { event: 'T4:session.idle' });
    R.push({ n: 'T4: idle event traced', p: idleEvents.length === 1 });

    hooks.onEvent('session.error', { sessionID: sidT4 });
    const errEvents = hooks.BrainTracer.query(sidT4, { event: 'T4:session.error' });
    R.push({ n: 'T4: error event traced', p: errEvents.length === 1 });

    // ── T4: unknown sessionID returns silently ──
    let noErr = true;
    try { hooks.onEvent('session.idle', {}); } catch (e) { noErr = false; }
    R.push({ n: 'T4: no sessionID does not throw', p: noErr });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
