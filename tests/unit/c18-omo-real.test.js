// c18-omo-real.test.js — C18 Real OMO category config test (oh-my-openagent.jsonc)
// Tests that brain categories exist and are properly registered in the OMO config

const fs = require('fs');
const path = require('path');

function stripJsonc(src) {
  return src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

module.exports = {
  name: 'C18: OMO real categories',
  run: async () => {
    const R = [];
    const cfgPath = path.join(__dirname, '..', '..', 'oh-my-openagent.jsonc');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(stripJsonc(raw));
    const cats = cfg.categories || {};

    // All expected brain categories
    const expected = [
      'brain-thalamus',
      'brain-amygdala',
      'brain-hippocampus',
      'brain-world-cortex',
      'brain-safety',
      'brain-attention',
      'brain-reward',
      'brain-basal',
      'brain-cerebellum',
      'brain-premotor-cortex',
      'brain-dlpfc',
      'brain-self-enhance',
      'brain-swarm-planner',
      'brain-swarm-coder',
      'brain-swarm-reviewer',
      'brain-swarm-tester',
      'brain-insula',
      'brain-hypothalamus',
      'brain-dmn',
      'brain-self-optimizer',
      'brain-consolidation',
      'brain-coordinator',
      'brain-gate-tuner',
      'brain-curiosity',
      'brain-discordia',
    ];

    for (const name of expected) {
      const cat = cats[name];
      R.push({ n: name + ' exists', p: !!cat });
      if (cat) {
        R.push({ n: name + '.model string', p: typeof cat.model === 'string' && cat.model.length > 0 });
        R.push({ n: name + '.variant string', p: typeof cat.variant === 'string' && cat.variant.length > 0 });
        R.push({ n: name + '.description string', p: typeof cat.description === 'string' && cat.description.length > 0 });
      }
    }

    // Built-in category overrides exist
    const builtIns = ['writing', 'quick', 'deep', 'ultrabrain', 'visual-engineering', 'artistry', 'unspecified-low', 'unspecified-high'];
    for (const name of builtIns) {
      R.push({ n: 'built-in category ' + name + ' exists', p: !!cats[name] });
    }

    // brain_mode block exists
    R.push({ n: 'brain_mode.enabled is true', p: cfg.brain_mode?.enabled === true });
    R.push({ n: 'brain_mode.perception has 4 layers', p: cfg.brain_mode?.perception?.layers?.length === 4 });
    R.push({ n: 'brain_mode.swarm has planner', p: !!cfg.brain_mode?.swarm?.planner });
    R.push({ n: 'brain_mode.swarm has 3 executors', p: cfg.brain_mode?.swarm?.executor?.length === 3 });
    R.push({ n: 'brain_mode.consolidation.enabled', p: cfg.brain_mode?.consolidation?.enabled === true });

    // team_mode exists
    R.push({ n: 'team_mode has brain-coordinator lead', p: cfg.team_mode?.lead === 'brain-coordinator' });

    return {
      passed: R.every(r => r.p),
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
