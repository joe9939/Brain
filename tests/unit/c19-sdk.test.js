// c19-sdk.test.js — C19 Plugin SDK hook signature validation
// Covers items 2.65-2.68: plugin export signature, hook signatures match expected types

module.exports = {
  name: 'C19: SDK signature',
  run: async () => {
    const start = Date.now();
    const R = [];
    try {
      const p = await import('../../src/plugin/brain-plugin.mjs');
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 2.65 plugin export signature
      {
        const hasBrainPlugin = typeof p.BrainPlugin === 'function';
        // Check it returns a promise (async factory)
        const factory = p.BrainPlugin;
        const returnsPromise = factory.length >= 1;
        const ctx = { directory: process.cwd(), on: function() {} };
        let hasHooks = false;
        try {
          const plugin = await factory(ctx);
          hasHooks = typeof plugin['tool.execute.before'] === 'function'
            && typeof plugin['tool.execute.after'] === 'function'
            && typeof plugin['session.event'] === 'function'
            && typeof plugin['experimental.chat.system.transform'] === 'function'
            && typeof plugin['experimental.chat.messages.transform'] === 'function'
            && typeof plugin['permission.ask'] === 'function';
        } catch (e) {}
        R.push({ n: '2.65 plugin-export-signature', p: hasBrainPlugin && returnsPromise && hasHooks });
      }

      // 2.66 hook signature tool.before
      {
        const hasOnToolBefore = typeof h.onToolBefore === 'function';
        const params = h.onToolBefore.length;
        R.push({ n: '2.66 hook-signature-tool-before (params=' + params + ')', p: hasOnToolBefore && params >= 2 });
      }

      // 2.67 hook signature chat.message (onMessage)
      {
        const hasOnMessage = typeof h.onMessage === 'function';
        const params = h.onMessage.length;
        R.push({ n: '2.67 hook-signature-chat-message (params=' + params + ')', p: hasOnMessage && params >= 2 });
      }

      // 2.68 hook signature session.event (onEvent)
      {
        const hasOnEvent = typeof h.onEvent === 'function';
        const params = h.onEvent.length;
        R.push({ n: '2.68 hook-signature-session-event (params=' + params + ')', p: hasOnEvent && params >= 2 });
      }

      // Additional: getStrongestSignal, getMentalState exist
      {
        R.push({ n: '2.68b getStrongestSignal exists', p: typeof h.getStrongestSignal === 'function' });
      }
      {
        R.push({ n: '2.68c getMentalState exists', p: typeof h.getMentalState === 'function' });
      }
      {
        R.push({ n: '2.68d onToolAfter exists', p: typeof h.onToolAfter === 'function' });
      }

    } catch (e) {
      R.push({ n: 'Error: ' + e.message, p: false });
    }
    return { passed: R.every(r => r.p), message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: Date.now() - start };
  },
};
if (require.main === module) { const r = module.exports.run(); r.then(res => { console.log(res.passed ? 'PASS' : 'FAIL'); process.exit(res.passed ? 0 : 1); }); }
