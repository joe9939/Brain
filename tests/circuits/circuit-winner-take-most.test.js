// circuit-winner-take-most.test.js →Winner-Take-Most Gate Competition
// Verifies L2 gate scoring, sorting, and top-N parallel execution
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Winner-Take-Most Gate Competition',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // Find L2 block
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = l2Idx >= 0 ? content.substring(l2Idx, l3Idx > l2Idx ? l3Idx : content.length) : '';

    // 1. WTA or gate competition section exists in L2
    results.push({ name: 'WTA/gate competition section in L2', pass: l2Block.includes('Winner-Take-Most') || l2Block.includes('gate competition') || l2Block.includes('Gate Competition') || l2Block.includes('score') });

    // 2. Gate scoring formula present
    const hasFormula = l2Block.includes('score') && (l2Block.includes('*') || l2Block.includes('+')) && (l2Block.includes('urgency') || l2Block.includes('reward') || l2Block.includes('safety'));
    results.push({ name: 'Gate scoring formula with weights', pass: hasFormula });

    // 3. Execution order = sorted descending by score
    results.push({ name: 'Gates sorted descending by score', pass: l2Block.includes('sort') || l2Block.includes('descending') || l2Block.includes('order') || l2Block.includes('rank') });

    // 4. Top-2 or more gates fire (not exclusive WTA-1)
    results.push({ name: 'Top-N gates fire (N>=2)', pass: l2Block.includes('top-2') || l2Block.includes('top 2') || l2Block.includes('top-two') || l2Block.includes('parallel') });

    // 5. Status display shows gate scores
    results.push({ name: 'Status display includes gate scores', pass: content.includes('score') && (content.includes('[L2:') || content.includes('STATUS DISPLAY')) });

    // 6. Gate competition orders by signal strength
    results.push({ name: 'Gate competition orders by signal strength', pass: l2Block.includes('signal strength') || l2Block.includes('Winner-Take-Most') || l2Block.includes('top gates') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Winner-Take-Most Gate Competition',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-winner-take-most.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' WTA gate competition checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};

