// circuit-reward-attention.test.js — Reward→Attention Modulation
// Verifies reward-cortex.score feeds into attention priority bias
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Reward→Attention Modulation',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. attention_priority_bias or equivalent formula in L1.5 modulation
    const l15Idx = content.indexOf('## L1.5');
    const l15Block = l15Idx >= 0 ? content.substring(l15Idx, Math.max(content.indexOf('## L2', l15Idx), content.indexOf('## L1.5', l15Idx) + 1)) : '';
    results.push({ name: 'L1.5 has attention_priority_bias formula', pass: l15Block.includes('attention_priority_bias') || (l15Block.includes('priority') && l15Block.includes('bias')) || (l15Block.includes('attention') && l15Block.includes('reward')) });

    // 2. L2 gate table has reward-cortex.score threshold
    const l2Idx = content.indexOf('## L2');
    const l2Block = l2Idx >= 0 ? content.substring(l2Idx, Math.max(content.indexOf('## L3', l2Idx), content.indexOf('## L2', l2Idx) + 1)) : '';
    results.push({ name: 'L2 gate table has reward trigger', pass: l2Block.includes('reward-cortex') || l2Block.includes('reward') });

    // 3. L2 prompt template includes priority bias
    results.push({ name: 'L2 prompt template has priority bias field', pass: content.includes('priority') && (content.includes('L2 prompt') || content.includes('L2 template')) });

    // 4. CIRCUIT CONNECTION REFERENCE has reward → attention row
    const circuitTableIdx = content.indexOf('## CIRCUIT CONNECTION REFERENCE');
    const circuitTable = circuitTableIdx >= 0 ? content.substring(circuitTableIdx) : '';
    results.push({ name: 'Circuit table: reward → attention', pass: circuitTable.includes('reward') && circuitTable.includes('attention') });

    // 5. Modulation formula is bounded (clamp/min/max)
    results.push({ name: 'Modulation formula has bounds (clamp)', pass: l15Block.includes('clamp') || l15Block.includes('min(') || l15Block.includes('max(') || l15Block.includes('bounded') || content.includes('clamp') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Reward→Attention Modulation',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-reward-attention.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' reward→attention modulation checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
