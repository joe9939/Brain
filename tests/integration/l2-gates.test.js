// l2-gates.test.js →L2 conditional gate integration test
// Verifies all 5 L2 gates are configured in brain-master.md
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'L2 Conditional Gates',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');

    // Find L2 section
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = content.substring(l2Idx, l3Idx > 0 ? l3Idx : content.length);

    // Check all 5 gates present in L2
    const gates = [
      { name: 'L2 has brain-attention', pattern: 'brain-attention' },
      { name: 'L2 has brain-reward', pattern: 'brain-reward' },
      { name: 'L2 has brain-safety', pattern: 'brain-safety' },
      { name: 'L2 has brain-basal', pattern: 'brain-basal' },
      { name: 'L2 has brain-cerebellum', pattern: 'brain-cerebellum' },
    ];

    const results = gates.map(g => ({
      name: g.name,
      pass: l2Block.includes(g.pattern),
    }));

    // Each gate has trigger condition and action (indicated by | separator in table, excl header/separator)
    const gateRows = l2Block.split('\n').filter(line => line.trim().startsWith('|') && line.includes('brain-') && !line.includes(' Condition '));
    const gateCount = gateRows.length;
    results.push({ name: 'L2 has 5 gate rows in table', pass: gateCount >= 5 });

    // Check expected trigger conditions (gate triggers from condition column)
    const triggers = [
      { name: 'todowrite trigger', text: 'todowrite >' },
      { name: 'score_action trigger', text: 'score_action <' },
      { name: 'danger pattern trigger', text: 'danger' },
      { name: 'SOP matched trigger', text: 'SOP' },
      { name: 'tool ambiguous trigger', text: 'ambiguous' },
    ];

    triggers.forEach(t => {
      results.push({ name: t.name, pass: l2Block.includes(t.text) });
    });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 10 L2 gate checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};

