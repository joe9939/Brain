// c19-sdk-real.test.js — C19 Real plugin SDK integration test (brain-plugin.mjs)
// Tests BrainPlugin is async, exports match expected hooks, hook handlers are async

module.exports = {
  name: 'C19: SDK real plugin',
  run: async () => {
    const R = [];
    const start = Date.now();

    const pluginMod = await import('../../src/plugin/brain-plugin.mjs');
    const hooksMod = await import('../../src/plugin/brain-hooks.mjs');

    // BrainPlugin is an async function (returns Promise)
    R.push({ n: 'BrainPlugin is function', p: typeof pluginMod.BrainPlugin === 'function' });
    const factory = pluginMod.BrainPlugin;
    const ctx = { directory: process.cwd(), on: function() {} };
    let plugin;
    try {
      plugin = await factory(ctx);
      R.push({ n: 'BrainPlugin returns Promise resolving to object', p: typeof plugin === 'object' && plugin !== null });
    } catch (e) {
      R.push({ n: 'BrainPlugin instantiation ' + e.message, p: false });
    }

    if (plugin) {
      // Expected hooks from OpenCode plugin API
      const expectedHooks = [
        'tool.execute.before',
        'tool.execute.after',
        'session.event',
        'experimental.chat.system.transform',
        'experimental.chat.messages.transform',
        'permission.ask',
      ];
      for (const hook of expectedHooks) {
        const fn = plugin[hook];
        R.push({ n: 'hook ' + hook + ' exists', p: typeof fn === 'function' });
        if (typeof fn === 'function') {
          const isAsync = fn.constructor.name === 'AsyncFunction';
          R.push({ n: 'hook ' + hook + ' is async', p: isAsync });
        }
      }
    }

    // Hook handlers from brain-hooks.mjs exist and are functions
    const expectedExports = ['onMessage', 'onToolBefore', 'onToolAfter', 'onEvent', 'getStrongestSignal', 'getSignalContext', 'getMentalState', 'BrainTracer'];
    for (const name of expectedExports) {
      const exp = hooksMod[name];
      R.push({ n: 'hooks export ' + name + ' exists', p: exp !== undefined });
    }

    // Specific hook signatures (async or sync)
    R.push({ n: 'onMessage is function', p: typeof hooksMod.onMessage === 'function' });
    R.push({ n: 'onToolBefore is function', p: typeof hooksMod.onToolBefore === 'function' });
    R.push({ n: 'onToolAfter is function', p: typeof hooksMod.onToolAfter === 'function' });
    R.push({ n: 'onEvent is function', p: typeof hooksMod.onEvent === 'function' });
    R.push({ n: 'getStrongestSignal is function', p: typeof hooksMod.getStrongestSignal === 'function' });
    R.push({ n: 'getMentalState is function', p: typeof hooksMod.getMentalState === 'function' });
    R.push({ n: 'BrainTracer has append', p: typeof hooksMod.BrainTracer?.append === 'function' });
    R.push({ n: 'BrainTracer has export', p: typeof hooksMod.BrainTracer?.export === 'function' });
    R.push({ n: 'BrainTracer has flush', p: typeof hooksMod.BrainTracer?.flush === 'function' });
    R.push({ n: 'BrainTracer has query', p: typeof hooksMod.BrainTracer?.query === 'function' });

    return {
      passed: R.every(r => r.p),
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: Date.now() - start,
    };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
