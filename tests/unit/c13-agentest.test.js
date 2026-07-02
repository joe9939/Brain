module.exports = {
  name: 'C13: agentest handler',
  run: async () => {
    const results = [];
    const path = require('path');
    const url = require('url');
    const handlerPath = url.pathToFileURL(path.join(__dirname, '..', 'agentest-handler.mjs')).href;

    // 1. Handler exports function
    let handler;
    try {
      const mod = await import(handlerPath);
      handler = mod.handler;
      results.push({ n: 'handler is exported', p: typeof handler === 'function' });
    } catch (e) {
      results.push({ n: 'handler is exported', p: false });
    }
    if (typeof handler !== 'function') {
      return { passed: false, message: 'FAIL handler export failed', time_ms: 0 };
    }

    // 2. Handler processes messages
    let r1;
    try {
      r1 = handler('c13-s1', { text: 'hello' });
      results.push({ n: 'handler returns object', p: r1 && typeof r1 === 'object' });
      results.push({ n: 'handler returns mechanisms', p: r1 && r1.mechanisms && typeof r1.mechanisms === 'object' });
      results.push({ n: 'handler returns response', p: r1 && typeof r1.response === 'string' });
      results.push({ n: 'mechanisms has signals', p: r1 && r1.mechanisms.signals && typeof r1.mechanisms.signals.winner === 'string' });
      results.push({ n: 'mechanisms has mood', p: r1 && r1.mechanisms.mood && typeof r1.mechanisms.mood.mode === 'string' });
      results.push({ n: 'mechanisms has reward', p: r1 && r1.mechanisms.reward && typeof r1.mechanisms.reward.score === 'number' });
      results.push({ n: 'mechanisms has gates', p: r1 && Array.isArray(r1.mechanisms.gates) && r1.mechanisms.gates.length === 7 });
      results.push({ n: 'mechanisms has l1_completed', p: r1 && typeof r1.mechanisms.l1_completed === 'number' });
    } catch (e) {
      results.push({ n: 'handler processes messages', p: false });
    }

    // 3. Handles different input formats
    try {
      const rEmpty = handler('c13-s2', { text: '' });
      results.push({ n: 'empty text returns mechanisms', p: rEmpty && rEmpty.mechanisms && rEmpty.mechanisms.signals });

      const rUrgent = handler('c13-s3', { text: 'URGENT: server is down, FIX NOW!!!' });
      results.push({ n: 'urgent text returns mechanisms', p: rUrgent && rUrgent.mechanisms && rUrgent.mechanisms.signals });

      const rCJK = handler('c13-s4', { text: '实现用户登录功能' });
      results.push({ n: 'CJK text returns mechanisms', p: rCJK && rCJK.mechanisms && rCJK.mechanisms.signals });

      const rMulti = handler('c13-s5', { text: 'implement dark mode, add tests, refactor auth, update docs, and deploy' });
      results.push({ n: 'complex text returns mechanisms', p: rMulti && rMulti.mechanisms && rMulti.mechanisms.signals });

      const rDangerous = handler('c13-s6', { text: 'rm -rf /var/log' });
      results.push({ n: 'dangerous text returns mechanisms', p: rDangerous && rDangerous.mechanisms && rDangerous.mechanisms.signals });
      if (rDangerous && rDangerous.mechanisms && rDangerous.mechanisms.gates) {
        const g1Blocked = rDangerous.mechanisms.gates.some(g => g.id === 'G1' && g.blocked);
        results.push({ n: 'dangerous text triggers G1', p: g1Blocked });
      } else {
        results.push({ n: 'dangerous text triggers G1', p: false });
      }
    } catch (e) {
      results.push({ n: 'handles different input formats', p: false });
    }

    // 4. In-process handler works (no crash) with various inputs
    try {
      const rA = handler('c13-sA', { text: 'hello' });
      const rB = handler('c13-sB', { text: 'implement auth' });
      results.push({ n: 'handler survives multiple sessions', p: rA && rB && typeof rA.response === 'string' && typeof rB.response === 'string' });
    } catch (e) {
      results.push({ n: 'handler survives multiple sessions', p: false });
    }

    const passed = results.every(r => r.p);
    return {
      passed,
      message: results.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
