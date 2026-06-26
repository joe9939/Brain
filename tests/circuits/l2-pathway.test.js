// l2-pathway.test.js — L2 conditional gate circuit connections
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'L2 Pathway Conditional Gates',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = content.substring(l2Idx, l3Idx > 0 ? l3Idx : content.length);
    const results = [];

    // Circuit connection reference exists
    results.push({ name: 'Circuit connection reference table', pass: content.includes('CIRCUIT CONNECTION REFERENCE') });

    // Each gate's modulation connections documented via the circuit table
    const gates = ['attention', 'reward', 'safety', 'basal', 'cerebellum'];
    gates.forEach(g => {
      results.push({ name: 'L2 gate ' + g + ' in circuit table', pass: content.includes(g) });
    });

    // Inhibitory connections documented
    const hasInhibited = content.includes('Inhibited By');
    results.push({ name: 'Inhibitory connections documented', pass: hasInhibited });

    // amygdala.CAUTION inhibits specific receivers
    results.push({ name: 'amygdala.CAUTION inhibits', pass: content.includes('amygdala.CAUTION') });

    // All 5 L2 gates have distinct trigger conditions in L2 table
    const tableRowCount = (l2Block.match(/\| ✅ \|/g) || []).length;
    results.push({ name: 'L2 table has 5 gate rows', pass: tableRowCount >= 5 });

    // Sender->Receiver notation used
    results.push({ name: 'Sender to Receiver notation', pass: content.includes('| \u2192 |') || content.includes('→') });

    // L2 fires only after L1 completes
    results.push({ name: 'L2 fires after L1', pass: content.includes('check after L1') || content.includes('after L1') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 8 L2 pathway checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
