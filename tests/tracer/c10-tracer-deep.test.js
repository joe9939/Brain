module.exports = {
  name: 'TRACER: deep (C10)',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const B = hooks.BrainTracer;

    // 1. Cross-session isolation under load
    {
      const sessions = [];
      for (let i = 0; i < 20; i++) {
        const sid = 'c10-load-' + i + '-' + Date.now();
        sessions.push(sid);
        hooks.onMessage(sid, 'msg ' + i);
        hooks.onToolAfter(sid, 'bash', {}, 'ok');
      }
      let allIsolated = true;
      for (const sid of sessions) {
        const events = B.export(sid);
        if (events.length !== 2) { allIsolated = false; break; }
        const hasT3 = events.some(e => e.event === 'T3:message');
        const hasT2 = events.some(e => e.event === 'T2:after');
        if (!hasT3 || !hasT2) { allIsolated = false; break; }
      }
      results.push({ name: '20 sessions isolated under load', pass: allIsolated });
    }

    // 2. Event order across 10 messages
    {
      const sid = 'c10-order-' + Date.now();
      const msgIds = [];
      for (let i = 0; i < 10; i++) {
        hooks.onMessage(sid, 'message ' + i);
        hooks.onToolBefore(sid, 'bash', { command: 'echo ok' });
        hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
        msgIds.push(i);
      }
      const all = B.export(sid);
      const events = all.map(e => e.event);

      let t3count = 0;
      let t1count = 0;
      let t2count = 0;
      let orderCorrect = true;
      let lastType = '';
      for (const evt of events) {
        if (evt === 'T3:message') { t3count++; if (lastType !== '' && lastType !== 'T2:after' && lastType !== 'SIGNAL') orderCorrect = false; }
        if (evt === 'T1:before') { t1count++; if (lastType !== 'T3:message') orderCorrect = false; }
        if (evt === 'T2:after') { t2count++; if (lastType !== 'T1:before' && lastType !== 'T2:after') orderCorrect = false; }
        lastType = evt;
      }
      results.push({ name: '10 messages each produce T3 event', pass: t3count === 10 });
      results.push({ name: '10 messages each produce T1 event', pass: t1count === 10 });
      results.push({ name: '10 messages each produce T2 events', pass: t2count >= 10 });
      results.push({ name: 'event order T3→T1→T2 is preserved', pass: orderCorrect });
    }

    // 3. Memory leak check: 100K events across sessions
    {
      const batchSid = 'c10-leak-' + Date.now();
      const startMem = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      for (let i = 0; i < 100000; i++) {
        B.append(batchSid, 'bulk', { i });
      }
      const buf = B.export(batchSid);
      const capped = buf.length;
      const endMem = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memDeltaMB = (endMem - startMem) / 1024 / 1024;
      results.push({ name: '100K events capped at 1000 per session', pass: capped === 1000 });
      results.push({ name: 'buffer keeps newest events', pass: buf[0].data.i === 99000 });
      results.push({ name: 'memory growth under 5MB for 100K events', pass: memDeltaMB < 5 || !process.memoryUsage });
    }

    // 4. Cross-session tracer isolation with concurrent writes
    {
      const sids = [];
      for (let i = 0; i < 10; i++) {
        sids.push('c10-conc-' + i + '-' + Date.now());
      }
      for (let round = 0; round < 100; round++) {
        for (const sid of sids) {
          B.append(sid, 'round-' + round, { r: round });
        }
      }
      let allCountsCorrect = true;
      for (const sid of sids) {
        const events = B.export(sid);
        if (events.length !== 100) { allCountsCorrect = false; break; }
      }
      results.push({ name: '10 sessions concurrent 100 rounds each, no cross-contamination', pass: allCountsCorrect });
    }

    // 5. Tracer events persist with correct session id
    {
      const sid = 'c10-sid-' + Date.now();
      B.append(sid, 'evt1', { x: 1 });
      B.append(sid, 'evt2', { x: 2 });
      const events = B.export(sid);
      results.push({ name: 'all events have correct sid', pass: events.every(e => e.sid === sid) });
    }

    // 6. query with event filter
    {
      const sid = 'c10-filter-' + Date.now();
      B.append(sid, 'typeA', {});
      B.append(sid, 'typeB', {});
      B.append(sid, 'typeA', {});
      const filtered = B.query(sid, { event: 'typeA' });
      results.push({ name: 'query filter returns only matching events', pass: filtered.length === 2 && filtered.every(e => e.event === 'typeA') });
    }

    // 7. flush returns data and clears buffer
    {
      const sid = 'c10-flush-' + Date.now();
      B.append(sid, 'f1', {});
      B.append(sid, 'f2', {});
      const payload = B.flush(sid, 'msg1');
      results.push({ name: 'flush returns payload with trace', pass: payload && payload.trace && payload.trace.length === 2 });
      results.push({ name: 'flush returns session id', pass: payload && payload.session === sid });
      results.push({ name: 'flush returns message id', pass: payload && payload.message === 'msg1' });
      const after = B.export(sid);
      results.push({ name: 'flush clears buffer', pass: after.length === 0 });
    }

    // 8. TS field is always a number
    {
      const sid = 'c10-ts-' + Date.now();
      B.append(sid, 'tscheck', {});
      const events = B.export(sid);
      results.push({ name: 'all events have numeric ts', pass: events.every(e => typeof e.ts === 'number' && e.ts > 0) });
    }

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); })(); }
