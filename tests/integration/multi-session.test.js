// multi-session.test.js — Integration: Session isolation and independence
const path = require('path');
const { pathToFileURL } = require('url');
const config = require('../config');

module.exports = {
  name: 'INTEGRATION: Multi-Session Isolation',
  run: async () => {
    const start = Date.now();
    const results = [];

    const hooks = await import(pathToFileURL(path.join(config.BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-hooks.mjs')));

    // 1. Create 3 sessions with different messages
    hooks.onMessage('session-ms1', 'hello world');
    hooks.onMessage('session-ms2', 'implement a new feature');
    hooks.onMessage('session-ms3', 'URGENT: bug fix needed');

    const ms1 = hooks.getMentalState('session-ms1');
    const ms2 = hooks.getMentalState('session-ms2');
    const ms3 = hooks.getMentalState('session-ms3');

    results.push({ name: 'Session 1 cycle=1', pass: ms1.cycle === 1 });
    results.push({ name: 'Session 2 cycle=1', pass: ms2.cycle === 1 });
    results.push({ name: 'Session 3 cycle=1', pass: ms3.cycle === 1 });

    // 2. Verify independent cycle counters
    hooks.onMessage('session-ms1', 'second message');
    hooks.onMessage('session-ms3', 'third message');

    const ms1b = hooks.getMentalState('session-ms1');
    const ms2b = hooks.getMentalState('session-ms2');
    const ms3b = hooks.getMentalState('session-ms3');

    results.push({ name: 'Session 1 cycle=2 (incremented)', pass: ms1b.cycle === 2 });
    results.push({ name: 'Session 2 cycle still=1 (unaffected)', pass: ms2b.cycle === 1 });
    results.push({ name: 'Session 3 cycle=2 (incremented)', pass: ms3b.cycle === 2 });

    // 3. Fire L1 agents in session 1 only — verify session 2 not affected
    hooks.onToolAfter('session-ms1', 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.4, score: 5 }));
    hooks.onToolAfter('session-ms1', 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', intensity: 0.2, valence: 0.3, arousal: 0.2 }));

    const ms1c = hooks.getMentalState('session-ms1');
    const ms2c = hooks.getMentalState('session-ms2');
    results.push({ name: 'Session 1 has L1 agents registered', pass: ms1c.l1.size > 0 });
    results.push({ name: 'Session 2 L1 unaffected', pass: ms2c.l1.size === 0 });

    // 4. Verify working memory is per-session
    hooks.onToolAfter('session-ms1', 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
    hooks.onToolAfter('session-ms2', 'task', { category: 'brain-hippocampus' }, JSON.stringify({ episodic: ['past fix'], relevant_sops: ['debug SOP'] }));

    const wm1 = hooks.getWorkingMemory('session-ms1');
    const wm2 = hooks.getWorkingMemory('session-ms2');

    results.push({ name: 'Session 1 has thalamus in wm', pass: wm1 && wm1['thalamus'] !== undefined });
    results.push({ name: 'Session 1 does NOT have hippocampus from session 2', pass: wm1 && wm1['hippocampus'] === undefined });
    results.push({ name: 'Session 2 has hippocampus in wm', pass: wm2 && wm2['hippocampus'] !== undefined });
    results.push({ name: 'Session 2 does NOT have thalamus from session 1', pass: wm2 && wm2['thalamus'] === undefined });

    // 5. Verify getSignalSummary returns different results per session based on state
    // Session 1: has L1 agents (thalamus, amygdala) — perceive signal active
    // Session 3: URGENT emotion set — emotion and perceive both active
    hooks.onToolAfter('session-ms3', 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'URGENT', confidence: 0.9, valence: -0.8, arousal: 0.95 }));

    const summary1 = hooks.getSignalSummary('session-ms1');
    const summary3 = hooks.getSignalSummary('session-ms3');

    results.push({ name: 'Session 1 has non-idle signal summary', pass: summary1 !== '' && summary1 !== 'idle' });
    results.push({ name: 'Session 3 has non-idle signal summary', pass: summary3 !== '' && summary3 !== 'idle' });
    // Summaries differ because session 3 has URGENT emotion boosting emotion signal
    results.push({ name: 'Signal summaries differ between sessions', pass: summary1 !== summary3 });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' multi-session checks passed'
        : 'Failed (' + failed.length + '/' + results.length + '): ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
