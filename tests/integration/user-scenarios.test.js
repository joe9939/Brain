// user-scenarios.test.js — Integration: User scenario simulation via brain-hooks.mjs
const path = require('path');
const { pathToFileURL } = require('url');
const config = require('../config');

module.exports = {
  name: 'INTEGRATION: User Scenarios',
  run: async () => {
    const start = Date.now();
    const results = [];

    const hooks = await import(pathToFileURL(path.join(config.BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-hooks.mjs')));

    // 1. Simple greeting "hello" — cycle=1, swarm=false
    hooks.onMessage('session-scenario1', 'hello');
    const s1 = hooks.getMentalState('session-scenario1');
    results.push({ name: 'Greeting: cycle=1', pass: s1.cycle === 1 });
    results.push({ name: 'Greeting: swarm=false', pass: s1.swarm === false });

    // 2. Complex task with >15 words — triggers swarm
    hooks.onMessage('session-scenario2', 'implement a new auth system with JWT and refresh tokens including OAuth and role-based access control');
    const s2 = hooks.getMentalState('session-scenario2');
    results.push({ name: 'Complex task: swarm=true', pass: s2.swarm === true });

    // 3. Code question — verifies world-cortex signal can be triggered
    hooks.onMessage('session-scenario3', 'how do I fix this TypeScript error');
    const s3 = hooks.getMentalState('session-scenario3');
    results.push({ name: 'Code question: cycle increments', pass: s3.cycle >= 1 });

    // Fire L1 agents to populate working memory for world-cortex
    hooks.onToolAfter('session-scenario3', 'task', { category: 'brain-world-cortex' }, JSON.stringify({ analysis: 'TS error at line 42', impact: 'type mismatch' }));
    const wm3 = hooks.getWorkingMemory('session-scenario3');
    results.push({ name: 'Code question: world-cortex in working memory', pass: wm3 && wm3['world-cortex'] !== undefined });

    // 4. Emergency "URGENT" — triggers emotion/safety signals
    hooks.onMessage('session-scenario4', 'URGENT: production is down');
    const s4 = hooks.getMentalState('session-scenario4');

    hooks.onToolAfter('session-scenario4', 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'URGENT', confidence: 0.9, valence: -0.8, arousal: 0.95 }));
    const strongest4 = hooks.getStrongestSignal('session-scenario4');
    results.push({ name: 'Emergency: safety signal fires for URGENT', pass: strongest4.length > 0 });

    // 5. Empty message — handled gracefully, cycle still increments
    hooks.onMessage('session-scenario5', '');
    const s5 = hooks.getMentalState('session-scenario5');
    results.push({ name: 'Empty message: cycle=1', pass: s5.cycle === 1 });
    results.push({ name: 'Empty message: no crash', pass: true });

    // 6. Multiple independent sessions don't interfere
    hooks.onMessage('session-a', 'hello from A');
    hooks.onMessage('session-b', 'hello from B');
    const sa = hooks.getMentalState('session-a');
    const sb = hooks.getMentalState('session-b');
    results.push({ name: 'Session A cycle independent', pass: sa.cycle === 1 });
    results.push({ name: 'Session B cycle independent', pass: sb.cycle === 1 });

    // Advance session A only
    hooks.onMessage('session-a', 'second message');
    const sa2 = hooks.getMentalState('session-a');
    const sb2 = hooks.getMentalState('session-b');
    results.push({ name: 'Session A cycle=2 after second message', pass: sa2.cycle === 2 });
    results.push({ name: 'Session B still cycle=1', pass: sb2.cycle === 1 });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' user scenario checks passed'
        : 'Failed (' + failed.length + '/' + results.length + '): ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
