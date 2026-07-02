// c13g-protocol.test.js — C13g Protocol scenarios via agentest-handler
// Covers plan items 6.31-6.38

module.exports = {
  name: 'C13g: protocol',
  run: async () => {
    const start = Date.now();
    const R = [];

    const handlerPath = require('path').join(__dirname, '..', 'agentest-handler.mjs');

    let handler;
    try {
      const mod = await import(require('url').pathToFileURL(handlerPath).href);
      handler = mod.handler;
    } catch (e) {
      return { passed: false, message: 'FAIL handler import: ' + e.message, time_ms: Date.now() - start };
    }

    try {
      // 6.31 demand-create-api
      {
        const r = handler('c13g-31', { text: 'create new API endpoint for user management' });
        const ok = r && r.mechanisms && r.mechanisms.signals && typeof r.mechanisms.signals.winner === 'string';
        R.push({ n: '6.31 demand-create-api', p: ok });
      }

      // 6.32 demand-delete-file
      {
        const r = handler('c13g-32', { text: 'delete that file from the server' });
        const ok = r && r.mechanisms && r.mechanisms.gates && r.mechanisms.gates.length === 7;
        R.push({ n: '6.32 demand-delete-file', p: ok });
      }

      // 6.33 demand-what-did-i-do
      {
        const r = handler('c13g-33', { text: 'what did I do last week' });
        const ok = r && r.mechanisms && r.mechanisms.signals && typeof r.mechanisms.signals.winner === 'string';
        R.push({ n: '6.33 demand-what-did-i-do', p: ok });
      }

      // 6.34 protocol-invalid-config
      {
        let ok = false;
        try { const r = handler('c13g-34', { }); ok = r && typeof r.response === 'string'; } catch (e) { ok = false; }
        R.push({ n: '6.34 protocol-invalid-config', p: ok });
      }

      // 6.35 protocol-null-message
      {
        let ok1 = false, ok2 = false, ok3 = false;
        try { const r = handler('c13g-35a', { text: null }); ok1 = r && typeof r.response === 'string'; } catch (e) { ok1 = false; }
        try { const r = handler('c13g-35b', { text: undefined }); ok2 = r && typeof r.response === 'string'; } catch (e) { ok2 = false; }
        try { const r = handler('c13g-35c', { text: '' }); ok3 = r && typeof r.response === 'string'; } catch (e) { ok3 = false; }
        R.push({ n: '6.35 protocol-null-message', p: ok1 && ok2 && ok3 });
      }

      // 6.36 protocol-rapid-100
      {
        let allOk = true;
        for (let i = 0; i < 100; i++) {
          try {
            const r = handler('c13g-36-' + i, { text: 'msg ' + i });
            if (!r || !r.mechanisms) { allOk = false; break; }
          } catch (e) { allOk = false; break; }
        }
        R.push({ n: '6.36 protocol-rapid-100', p: allOk });
      }

      // 6.37 protocol-mixed-calls
      {
        const sid = 'c13g-37';
        const h = await import('../../src/plugin/brain-hooks.mjs');
        let msgOk = false, toolOk = false;
        try {
          const r1 = handler(sid, { text: 'implement dark mode' });
          msgOk = r1 && r1.mechanisms && r1.mechanisms.l1_completed === 5;

          // Simulate additional tool call
          const r2 = handler(sid, { text: 'add tests too' });
          // After second message, L1 resets for new cycle and should get 5 L1 completions again
          toolOk = r2 && r2.mechanisms && typeof r2.response === 'string';
        } catch (e) { msgOk = false; toolOk = false; }
        R.push({ n: '6.37 protocol-mixed-calls', p: msgOk && toolOk });
      }

      // 6.38 protocol-reuse-after-close
      {
        const sid = 'c13g-38';
        const h = await import('../../src/plugin/brain-hooks.mjs');
        let beforeOk = false, afterOk = false;
        try {
          const r1 = handler(sid, { text: 'first message' });
          beforeOk = r1 && typeof r1.response === 'string' && r1.mechanisms.cycles === 1;

          // Reuse same session ID — should get cycle 2 (new cycle)
          const r2 = handler(sid, { text: 'second message after close' });
          afterOk = r2 && typeof r2.response === 'string' && r2.mechanisms.cycles === 2;
        } catch (e) { beforeOk = false; afterOk = false; }
        R.push({ n: '6.38 protocol-reuse-after-close', p: beforeOk && afterOk });
      }
    } catch (e) {
      R.push({ n: 'Error: ' + e.message, p: false });
    }

    return { passed: R.every(r => r.p), message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: Date.now() - start };
  },
};
if (require.main === module) { module.exports.run().then(r => { console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); }); }
