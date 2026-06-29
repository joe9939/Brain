const { execSync } = require('child_process');
const path = require('path');

module.exports = {
  name: 'PLUGIN: Lifecycle',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      var pluginPath = path.join(__dirname, '../../src/plugin/brain-plugin.mjs');
      execSync('node --check "' + pluginPath + '"', { stdio: 'pipe' });
      results.push({ name: 'brain-plugin.mjs parses', pass: true });
    } catch (e) {
      results.push({ name: 'brain-plugin.mjs parse error: ' + e.message.slice(0, 40), pass: false });
    }

    try {
      var hooksPath = path.join(__dirname, '../../src/plugin/brain-hooks.mjs');
      execSync('node --check "' + hooksPath + '"', { stdio: 'pipe' });
      results.push({ name: 'brain-hooks.mjs parses', pass: true });
    } catch (e) {
      results.push({ name: 'brain-hooks.mjs parse error: ' + e.message.slice(0, 40), pass: false });
    }

    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var expected = ['onMessage', 'onToolBefore', 'onToolAfter', 'onEvent', 'getStrongestSignal', 'getMentalState', 'getWorkingMemory'];
      for (var i = 0; i < expected.length; i++) {
        var exp = expected[i];
        results.push({ name: 'hooks exports ' + exp, pass: typeof h[exp] === 'function' });
      }
    } catch (e) {
      results.push({ name: 'hooks import error: ' + e.message.slice(0, 50), pass: false });
      for (var i = 1; i < 7; i++) {
        results.push({ name: 'hooks export (cascaded fail)', pass: false });
      }
    }

    try {
      var p = await import('../../src/plugin/brain-plugin.mjs');
      var plugin = p.BrainPlugin;
      results.push({ name: 'BrainPlugin is a function', pass: typeof plugin === 'function' });
      var r = plugin({ on: function() {} });
      results.push({ name: 'BrainPlugin returns a Promise', pass: r instanceof Promise });
    } catch (e) {
      results.push({ name: 'plugin import error: ' + e.message.slice(0, 50), pass: false });
      results.push({ name: 'BrainPlugin (cascaded fail)', pass: false });
    }

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
