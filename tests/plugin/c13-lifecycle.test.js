// c13-lifecycle.test.js — C13e Plugin lifecycle: T1→T2→T3→T4 cycle + G1 blocks
// Covers plan items 5.41-5.42

module.exports = {
  name: 'C13e: lifecycle',
  run: async () => {
    const start = Date.now();
    const R = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const uid = () => 'c13e-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

      // 5.41 T1→T2→T3→T4 full cycle
      {
        const sid = uid();
        h.onMessage(sid, 'implement user login feature with email and password authentication system including OAuth providers');
        const s0 = h.getMentalState(sid);
        const t3Ok = s0 && s0.cycle === 1 && s0.l1.size === 0;

        let t1Ok = false;
        try { h.onToolBefore(sid, 'bash', { command: 'ls' }); t1Ok = true; } catch (e) { t1Ok = false; }

        let t2Ok = false;
        try { h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate: 'PASS' })); t2Ok = true; } catch (e) { t2Ok = false; }

        let t4Ok = false;
        try { h.onEvent('session.idle', { sessionID: sid }); t4Ok = true; } catch (e) { t4Ok = false; }

        const state = h.getMentalState(sid);
        R.push({ n: '5.41 T1-T2-T3-T4 full cycle', p: t3Ok && t1Ok && t2Ok && t4Ok && state.cycle >= 1 });
      }

      // 5.42 G1 block
      {
        const sid = uid();
        h.onMessage(sid, 'test');
        let threw = false;
        try { h.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) { threw = e.message === 'G1 BLOCK'; }
        R.push({ n: '5.42a G1 block', p: threw });
      }

      // 5.42a G1 block (duplicate)
      {
        const sid = uid();
        h.onMessage(sid, 'test');
        let threw1 = false, threw2 = false;
        try { h.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) { threw1 = e.message === 'G1 BLOCK'; }
        try { h.onToolBefore(sid, 'bash', { command: 'rm -rf /' }); } catch (e) { threw2 = e.message === 'G1 BLOCK'; }
        R.push({ n: '5.42b G1 block (duplicate)', p: threw1 && threw2 });
      }
    } catch (e) {
      R.push({ n: 'Error: ' + e.message, p: false });
    }
    return { passed: R.every(r => r.p), message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: Date.now() - start };
  },
};
if (require.main === module) { module.exports.run().then(r => { console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); }); }
