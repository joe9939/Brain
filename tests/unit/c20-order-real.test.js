// c20-order-real.test.js — C20 Real plugin order test (opencode.json plugin array)
// Tests that the plugin list contains oh-my-openagent and brain-plugin.mjs in correct order

const fs = require('fs');
const path = require('path');

function findConfig() {
  const candidates = [
    path.join(__dirname, '..', '..', 'config', 'opencode.example.json'),
    path.join(__dirname, '..', '..', 'opencode.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const home = require('os').homedir();
  const user = path.join(home, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(user)) return user;
  return candidates[0];
}

module.exports = {
  name: 'C20: plugin order (real)',
  run: async () => {
    const R = [];
    const cfgPath = findConfig();
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw);
    const plugins = cfg.plugin || [];

    R.push({ n: 'plugin array exists and has items', p: Array.isArray(plugins) && plugins.length > 0 });

    // Plugin list has oh-my-openagent
    const hasOmo = plugins.some(p => typeof p === 'string' && p.includes('oh-my-openagent'));
    R.push({ n: 'plugin list has oh-my-openagent', p: hasOmo });

    // Plugin has brain-plugin.mjs
    const hasBrain = plugins.some(p => typeof p === 'string' && p.includes('brain-plugin.mjs'));
    R.push({ n: 'plugin list has brain-plugin.mjs', p: hasBrain });

    // Order: oh-my-openagent should be before brain-plugin
    if (hasOmo && hasBrain) {
      const omoIdx = plugins.findIndex(p => typeof p === 'string' && p.includes('oh-my-openagent'));
      const brainIdx = plugins.findIndex(p => typeof p === 'string' && p.includes('brain-plugin.mjs'));
      R.push({ n: 'oh-my-openagent before brain-plugin.mjs', p: omoIdx >= 0 && brainIdx >= 0 && omoIdx < brainIdx });
    }

    // Each plugin entry is a string
    for (let i = 0; i < plugins.length; i++) {
      R.push({ n: 'plugin[' + i + '] is string', p: typeof plugins[i] === 'string' });
    }

    // No duplicates
    const unique = new Set(plugins.map(p => p.replace(/\\/g, '/')));
    R.push({ n: 'no duplicate plugin entries', p: unique.size === plugins.length });

    return {
      passed: R.every(r => r.p),
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
