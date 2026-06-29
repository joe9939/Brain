module.exports = {
  name: 'BEHAVIORAL: Swarm Detection',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const hooks = await import('../../src/plugin/brain-hooks.mjs');

      // ── Test 1: Simple short message → swarm stays false ──
      const sid1 = 'sd-1-' + Date.now();
      hooks.onMessage(sid1, 'hello');
      const s1 = hooks.getMentalState(sid1);
      results.push({ name: 'Simple message keeps swarm false', pass: s1.swarm === false });

      // ── Test 2: Short message even with "implement" → swarm stays false (needs >15 words) ──
      const sid2 = 'sd-2-' + Date.now();
      hooks.onMessage(sid2, 'implement a feature');
      const s2 = hooks.getMentalState(sid2);
      results.push({ name: 'Short implement keeps swarm false', pass: s2.swarm === false });

      // ── Test 3: Long complex message triggers swarm=true ──
      const sid3 = 'sd-3-' + Date.now();
      const longComplex = 'implement a complex feature that needs multiple components and careful design across many different files and modules across the stack';
      hooks.onMessage(sid3, longComplex);
      const s3 = hooks.getMentalState(sid3);
      results.push({ name: 'Long complex message sets swarm true', pass: s3.swarm === true });

      // ── Test 4: "create" with long text also triggers swarm ──
      const sid4 = 'sd-4-' + Date.now();
      const createLong = 'create a brand new authentication system with login register and password reset features across multiple different modules';
      hooks.onMessage(sid4, createLong);
      const s4 = hooks.getMentalState(sid4);
      results.push({ name: '"create" triggers swarm with long text', pass: s4.swarm === true });

      // ── Test 5: After COMPLETE, swarm resets to false ──
      const sid5 = 'sd-5-' + Date.now();
      const refactorLong = 'refactor the entire database layer to use connection pooling and caching for much better performance across all queries';
      hooks.onMessage(sid5, refactorLong);
      let s5 = hooks.getMentalState(sid5);
      results.push({ name: 'Swarm set true before COMPLETE', pass: s5.swarm === true });
      hooks.onToolAfter(sid5, 'bash', {}, 'All done COMPLETE');
      s5 = hooks.getMentalState(sid5);
      results.push({ name: 'Swarm resets false after COMPLETE', pass: s5.swarm === false });

      // ── Test 6: After PASS also resets swarm ──
      const sid6 = 'sd-6-' + Date.now();
      const buildLong = 'build a brand new microservices architecture with service discovery and load balancing across multiple different containers and environments';
      hooks.onMessage(sid6, buildLong);
      let s6 = hooks.getMentalState(sid6);
      results.push({ name: 'Swarm true before PASS reset', pass: s6.swarm === true });
      hooks.onToolAfter(sid6, 'bash', {}, 'All tests PASS');
      s6 = hooks.getMentalState(sid6);
      results.push({ name: 'Swarm resets false after PASS', pass: s6.swarm === false });

      // ── Test 7: "implement" with >15 words triggers swarm ──
      const sid7 = 'sd-7-' + Date.now();
      const implementLong = 'implement a brand new caching layer that supports both redis and memcached backends with automatic failover and retry logic';
      hooks.onMessage(sid7, implementLong);
      const s7 = hooks.getMentalState(sid7);
      results.push({ name: '"implement" with >15 words sets swarm', pass: s7.swarm === true });
    } catch(e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
