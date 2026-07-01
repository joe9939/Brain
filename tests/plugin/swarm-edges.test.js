module.exports = {
  name: 'PLUGIN: Swarm Edges',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 1. Long complex text (>15 words with keyword) triggers swarm
      {
        const sid = 'sw1-' + Date.now();
        h.onMessage(sid, 'implement a complex feature that spans multiple files across the entire codebase with many different components and careful design');
        const s = h.getMentalState(sid);
        results.push({ name: 'Long complex text triggers swarm', pass: s.swarm === true });
      }

      // 2. Short message does not trigger swarm
      {
        const sid = 'sw2-' + Date.now();
        h.onMessage(sid, 'hello');
        const s = h.getMentalState(sid);
        results.push({ name: 'Short message no swarm', pass: s.swarm === false });
      }

      // 3. COMPLETE clears swarm
      {
        const sid = 'sw3-' + Date.now();
        h.onMessage(sid, 'implement a big new system with many files and lots of code changes across all the different modules');
        const s1 = h.getMentalState(sid);
        h.onToolAfter(sid, 'bash', {}, 'Task COMPLETE');
        const s2 = h.getMentalState(sid);
        results.push({ name: 'COMPLETE clears swarm', pass: s1.swarm && !s2.swarm });
      }

      // 4. PASS clears swarm
      {
        const sid = 'sw4-' + Date.now();
        h.onMessage(sid, 'build a complex feature with many different components and files that need to be changed across the project');
        const s1 = h.getMentalState(sid);
        h.onToolAfter(sid, 'bash', {}, 'All tests PASS');
        const s2 = h.getMentalState(sid);
        results.push({ name: 'PASS clears swarm', pass: s1.swarm && !s2.swarm });
      }

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return { passed, message: passed ? 'All ' + results.length + ' checks passed' : 'Fail: ' + failed.join(', '), time_ms: Date.now() - start };
  },
};
