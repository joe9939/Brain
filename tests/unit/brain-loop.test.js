module.exports = {
  name: 'Brain Loop Simulation',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];

      const sid = 'loop-' + Date.now();
      h.onMessage(sid, 'implement a complex feature that requires many different files and changes across multiple components of the system');
      var s = h.getMentalState(sid);
      results.push({ name: 'T3: user message initializes state', pass: s.cycle === 1 });
      results.push({ name: 'T3: swarm triggered for complex task', pass: s.swarm === true });

      var sig = h.getStrongestSignal(sid);
      results.push({ name: 'T1: perceive signal injected', pass: Array.isArray(sig) && sig.some(function(m) { return m.content && m.content.indexOf('Parallel Perception') >= 0; }) });

      for (var cat of L1) {
        h.onToolAfter(sid, 'task', { category: cat }, cat === 'brain-amygdala' ? '{"mode":"CAUTION","confidence":0.8}' : '{}');
      }
      s = h.getMentalState(sid);
      results.push({ name: 'T2: 5 L1 agents completed', pass: s.l1.size === 5 });

      // Set high score to avoid reward signal dominating over emotion/safety
      h.getMentalState(sid).M_rew.score = 5;
      sig = h.getStrongestSignal(sid);
      results.push({ name: 'Post-L1 signal fires (CAUTION)', pass: Array.isArray(sig) && sig.length > 0 });

      h.getStrongestSignal(sid); // dedup
      h.onToolAfter(sid, 'bash', {}, 'All tests PASS');
      s = h.getMentalState(sid);
      results.push({ name: 'T2: task completion tracked', pass: s.M_goal.completed > 0 });

      var wm = h.getWorkingMemory(sid);
      results.push({ name: 'Working memory accessible', pass: wm && typeof wm === 'object' });

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return { passed, message: passed ? 'All ' + results.length + ' checks passed' : 'Fail: ' + failed.join(', '), time_ms: Date.now() - start };
  },
};
