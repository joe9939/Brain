// hooks.test.js — brain-hooks.mjs unit tests
// L1=perception, L2=emotion, L3=reward, brain-loop signals

const L1_AGENTS = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];

function uid() { return 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }

module.exports = {
  name: 'Brain Hooks (L1-L3 Signals)',
  run: async () => {
    const start = Date.now();
    const results = [];

    // Dynamic import of ESM module from CJS runner
    const hooks = await import('../../src/plugin/brain-hooks.mjs');

    // ── Test 1: onMessage basic ──
    {
      const sid = uid();
      hooks.onMessage(sid, 'hello');
      // Can't directly access internal S map, but we can verify via getMentalState
      const state = hooks.getMentalState(sid);
      results.push({ name: 'T1 onMessage cycle===1', pass: state.cycle === 1 });
      results.push({ name: 'T1 _last_signal===null', pass: state._last_signal === null });
      results.push({ name: 'T1 swarm===false for short', pass: state.swarm === false });
    }

    // ── Test 2: onMessage complex ──
    {
      const sid = uid();
      hooks.onMessage(sid, 'implement a complex feature that needs multiple components and careful design across many different files and modules');
      const state = hooks.getMentalState(sid);
      results.push({ name: 'T2 swarm===true for complex', pass: state.swarm === true });
    }

    // ── Test 3: L1 completion tracking ──
    {
      const sid = uid();
      hooks.onMessage(sid, 'run all L1 agents');
      for (const agent of L1_AGENTS) {
        hooks.onToolAfter(sid, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.7, score: 1 }));
      }
      const state = hooks.getMentalState(sid);
      results.push({ name: 'T3 l1.size===5', pass: state.l1.size === 5 });
      results.push({ name: 'T3 wm populated', pass: Object.keys(state.wm).length > 0 });
      results.push({ name: 'T3 M_rew.score set', pass: state.M_rew.score > 0 });
      results.push({ name: 'T3 M_emo.mode set', pass: state.M_emo.mode === 'NORMAL' });
    }

    // ── Test 4: Temporal derivative ──
    {
      const sid = uid();
      hooks.onMessage(sid, 'compute td');
      // Set a reward first
      hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 3 }));
      // Trigger completion: output containing PASS triggers td_error = prev - current
      hooks.onToolAfter(sid, 'bash', {}, 'All tests PASS');
      const state = hooks.getMentalState(sid);
      // prev was 3, current is still 3 (no new score), so td_error = 3 - 3 = 0
      // Actually td_error = prev - s.M_rew.score where prev was captured before incrementing goals
      // prev=3, current=3 → td_error=0
      results.push({ name: 'T4 td_error computed', pass: typeof state.td_error === 'number' });
      results.push({ name: 'T4 M_goal incremented', pass: state.M_goal.completed >= 1 });
    }

    // ── Test 5: getStrongestSignal ──
    {
      const sid = uid();
      hooks.onMessage(sid, 'test signals');
      // Fill L1 so signal system has state to work with
      for (const agent of L1_AGENTS) {
        hooks.onToolAfter(sid, 'task', { category: agent }, JSON.stringify({ mode: 'NORMAL', confidence: 0.7, score: 1 }));
      }
      const signals = hooks.getStrongestSignal(sid);
      results.push({ name: 'T5 returns array', pass: Array.isArray(signals) });
    }

    // ── Test 6: Safety — onToolBefore blocks rm -rf / ──
    {
      const sid = uid();
      var threw = false;
      try {
        hooks.onToolBefore(sid, 'bash', { command: 'rm -rf /' });
      } catch (e) {
        threw = true;
      }
      results.push({ name: 'T6 rm -rf / throws G1', pass: threw });
    }

    // ── Teardown signal: verify getStrongestSignal returns [] for unknown ID ──
    {
      const signals = hooks.getStrongestSignal('nonexistent-' + uid());
      results.push({ name: 'T7 unknown returns []', pass: Array.isArray(signals) && signals.length === 0 });
    }

    const passed = results.every(function(r) { return r.pass; });
    const failed = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });
    return {
      passed: passed,
      message: passed
        ? 'All ' + results.length + ' hook checks passed'
        : 'Fail: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
