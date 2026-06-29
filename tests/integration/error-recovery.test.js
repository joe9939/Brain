// error-recovery.test.js — Integration: Error handling and recovery
const path = require('path');
const { pathToFileURL } = require('url');
const config = require('../config');

module.exports = {
  name: 'INTEGRATION: Error Recovery',
  run: async () => {
    const start = Date.now();
    const results = [];

    const hooks = await import(pathToFileURL(path.join(config.BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-hooks.mjs')));

    // 1. Bad JSON in tool output — hook doesn't crash
    try {
      hooks.onMessage('session-err1', 'test bad json');
      hooks.onToolAfter('session-err1', 'task', { category: 'brain-thalamus' }, 'not valid json {{{');
      const s = hooks.getMentalState('session-err1');
      results.push({ name: 'Bad JSON does not crash', pass: true });
      // L1 set should still have the agent added even though JSON parse failed
      results.push({ name: 'L1 agent tracked despite bad JSON', pass: s.l1.has('brain-thalamus') });
    } catch (e) {
      results.push({ name: 'Bad JSON does not crash', pass: false });
    }

    // 2. Missing fields in JSON — hook uses defaults
    hooks.onToolAfter('session-err2', 'task', { category: 'brain-amygdala' }, JSON.stringify({}));
    const s2 = hooks.getMentalState('session-err2');
    // amygdala should be stored in working memory even with empty JSON
    const wm2 = hooks.getWorkingMemory('session-err2');
    results.push({ name: 'Empty JSON in working memory', pass: wm2 && wm2['amygdala'] !== undefined });

    // With no mode, confidence, etc. — defaults should be used
    // M_emo should remain default values since empty JSON lacks mode
    results.push({ name: 'Default emotion mode', pass: s2.M_emo.mode === 'NORMAL' });
    results.push({ name: 'Default emotion intensity', pass: s2.M_emo.intensity === 0.1 });
    results.push({ name: 'Default emotion valence', pass: s2.M_emo.valence === 0.1 });
    results.push({ name: 'Default emotion arousal', pass: s2.M_emo.arousal === 0.3 });

    // Partial fields — only provided fields update
    hooks.onToolAfter('session-err2', 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'CAUTION', confidence: 0.8 }));
    const s2b = hooks.getMentalState('session-err2');
    // mode and intensity should update from the partial data
    results.push({ name: 'Partial update: mode=CAUTION', pass: s2b.M_emo.mode === 'CAUTION' });
    results.push({ name: 'Partial update: intensity from confidence', pass: s2b.M_emo.intensity === 0.8 });
    // valence/arousal should use defaults since not provided
    results.push({ name: 'Partial update: defaults for missing fields', pass: s2b.M_emo.valence === 0.1 && s2b.M_emo.arousal === 0.3 });

    // 3. Double-firing same L1 agent — set tracks unique
    hooks.onMessage('session-err3', 'test dedup');
    hooks.onToolAfter('session-err3', 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL' }));
    const s3a = hooks.getMentalState('session-err3');
    const before = s3a.l1.size;

    hooks.onToolAfter('session-err3', 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.9 }));
    const s3b = hooks.getMentalState('session-err3');
    const after = s3b.l1.size;

    results.push({ name: 'Set size same after double-fire (unique)', pass: before === after });
    results.push({ name: 'Set has exactly 1 entry', pass: after === 1 });

    // Fire other L1 agents and verify cumulative count
    hooks.onToolAfter('session-err3', 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL' }));
    hooks.onToolAfter('session-err3', 'task', { category: 'brain-hippocampus' }, JSON.stringify({ episodic: [] }));
    const s3c = hooks.getMentalState('session-err3');
    results.push({ name: 'Set size=3 after 3 unique L1 agents', pass: s3c.l1.size === 3 });

    // Double-fire one more time
    hooks.onToolAfter('session-err3', 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'CAUTION' }));
    const s3d = hooks.getMentalState('session-err3');
    results.push({ name: 'Set size still=3 after double-fire again', pass: s3d.l1.size === 3 });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' error recovery checks passed'
        : 'Failed (' + failed.length + '/' + results.length + '): ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
