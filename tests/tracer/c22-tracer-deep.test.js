// c22-tracer-deep.test.js — C22 Enhanced tracer tests: buffer cap, perf, cross-session isolation

module.exports = {
  name: 'C22: tracer deep (real)',
  run: async () => {
    const R = [];
    const start = Date.now();
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const T = hooks.BrainTracer;

    // ── 1. Buffer caps at 1000 events per session ──
    {
      const sid = 'c22-cap-' + Date.now();
      for (let i = 0; i < 2000; i++) {
        T.append(sid, 'bulk', { i });
      }
      const events = T.export(sid);
      R.push({ n: 'buffer caps at 1000 events (got ' + events.length + ')', p: events.length === 1000 });
    }

    // ── 2. Latest events preserved (not oldest) ──
    {
      const sid = 'c22-latest-' + Date.now();
      for (let i = 0; i < 2000; i++) {
        T.append(sid, 'evt', { i });
      }
      const events = T.export(sid);
      const hasFirst = events.some(e => e.data && e.data.i === 0);
      const hasLast = events.some(e => e.data && e.data.i === 1999);
      R.push({ n: 'oldest event evicted (first not present)', p: !hasFirst });
      R.push({ n: 'newest event preserved', p: hasLast });
    }

    // ── 3. 1000 appends under 100ms ──
    {
      const sid = 'c22-perf-' + Date.now();
      const t0 = Date.now();
      for (let i = 0; i < 1000; i++) {
        T.append(sid, 'perf', { i });
      }
      const elapsed = Date.now() - t0;
      R.push({ n: '1000 appends in ' + elapsed + 'ms (limit 100ms)', p: elapsed < 100 });
    }

    // ── 4. 10000 appends across sessions under 200ms ──
    {
      const sids = [];
      const t0 = Date.now();
      for (let s = 0; s < 10; s++) {
        const sid = 'c22-bulk-' + s + '-' + Date.now();
        sids.push(sid);
        for (let i = 0; i < 1000; i++) {
          T.append(sid, 'bulk', { s, i });
        }
      }
      const elapsed = Date.now() - t0;
      R.push({ n: '10K appends (10 sessions x 1K) in ' + elapsed + 'ms (limit 200ms)', p: elapsed < 200 });
    }

    // ── 5. Cross-session isolation: no events leak between sessions ──
    {
      const sidA = 'c22-isol-a-' + Date.now();
      const sidB = 'c22-isol-b-' + Date.now();
      for (let i = 0; i < 50; i++) {
        T.append(sidA, 'typeA', { val: i });
      }
      for (let i = 0; i < 30; i++) {
        T.append(sidB, 'typeB', { val: i });
      }
      const aEvents = T.export(sidA);
      const bEvents = T.export(sidB);
      const aAllTypeA = aEvents.every(e => e.event === 'typeA');
      const bAllTypeB = bEvents.every(e => e.event === 'typeB');
      R.push({ n: 'session A only typeA events', p: aEvents.length === 50 && aAllTypeA });
      R.push({ n: 'session B only typeB events', p: bEvents.length === 30 && bAllTypeB });
    }

    // ── 6. Cross-session isolation under heavy concurrent writes ──
    {
      const sid1 = 'c22-heavy-1-' + Date.now();
      const sid2 = 'c22-heavy-2-' + Date.now();
      for (let r = 0; r < 500; r++) {
        T.append(sid1, 'heavy', { r });
        T.append(sid2, 'heavy', { r });
      }
      const ev1 = T.export(sid1);
      const ev2 = T.export(sid2);
      R.push({ n: 'heavy concurrent: session1 has 500 events', p: ev1.length === 500 });
      R.push({ n: 'heavy concurrent: session2 has 500 events', p: ev2.length === 500 });
    }

    // ── 7. Session isolation after flush ──
    {
      const sidF = 'c22-flush-isol-' + Date.now();
      T.append(sidF, 'pre', {});
      T.flush(sidF, 'msg1');
      const afterFlush = T.export(sidF);
      T.append(sidF, 'post', {});
      const afterAppend = T.export(sidF);
      R.push({ n: 'flush empties buffer for session', p: afterFlush.length === 0 });
      R.push({ n: 'new events after flush appear', p: afterAppend.length === 1 && afterAppend[0].event === 'post' });
    }

    // ── 8. Multiple flushes don't affect other sessions ──
    {
      const sidX = 'c22-multi-x-' + Date.now();
      const sidY = 'c22-multi-y-' + Date.now();
      T.append(sidX, 'event1', {});
      T.flush(sidX, 'm1');
      T.append(sidY, 'event2', {});
      T.append(sidX, 'event3', {});
      const xEv = T.export(sidX);
      const yEv = T.export(sidY);
      R.push({ n: 'multi-flush: sessionX has 1 event after flush+append', p: xEv.length === 1 && xEv[0].event === 'event3' });
      R.push({ n: 'multi-flush: sessionY untouched', p: yEv.length === 1 && yEv[0].event === 'event2' });
    }

    const passed = R.every(r => r.p);
    return {
      passed,
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: Date.now() - start,
    };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
