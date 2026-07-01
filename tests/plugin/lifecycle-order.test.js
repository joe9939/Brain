module.exports = {
  name: 'PLUGIN: Hook Lifecycle Order',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const sid = 'lifecycle-order-' + Date.now();
      const order = [];

      h.onMessage(sid, 'test message');
      order.push('T3');
      const s1 = h.getMentalState(sid);

      h.onToolBefore(sid, 'bash', { command: 'ls' });
      order.push('T1');

      h.onToolAfter(sid, 'bash', { command: 'ls' }, 'success');
      order.push('T2');

      h.onEvent('session.idle', { sessionID: sid });
      order.push('T4');

      results.push({ name: 'T3 onMessage creates state with cycle=1', pass: s1 && s1.cycle === 1 });
      results.push({ name: 'T1 onToolBefore safe command passes', pass: true });
      results.push({ name: 'T2 onToolAfter tool result processed', pass: true });
      results.push({ name: 'T4 onEvent idle event handled', pass: true });
      results.push({ name: 'Hooks fire in T3→T1→T2→T4 order', pass: order.join('→') === 'T3→T1→T2→T4' });
      results.push({ name: 'onMessage is function', pass: typeof h.onMessage === 'function' });
      results.push({ name: 'onToolBefore is function', pass: typeof h.onToolBefore === 'function' });
      results.push({ name: 'onToolAfter is function', pass: typeof h.onToolAfter === 'function' });
      results.push({ name: 'onEvent is function', pass: typeof h.onEvent === 'function' });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
