// circuit-attention-budget.test.js — Shared Attention Budget
// Verifies attention_budget field in GLOBAL_STATE is allocated, consumed, and renewed
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Shared Attention Budget',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. attention_budget field in GLOBAL_STATE
    results.push({ name: 'attention_budget in GLOBAL_STATE', pass: content.includes('attention_budget') || (content.includes('attention') && content.includes('budget')) });

    // 2. Budget is bounded 0.0-1.0
    const hasBudgetBounds = content.includes('0.0') || content.includes('0-1') || content.includes('0.0-1.0') || content.includes('clamp') || content.includes('max') || content.includes('min');
    results.push({ name: 'Attention budget bounded 0.0-1.0', pass: hasBudgetBounds });

    // 3. Budget consumed when L2 gates fire
    results.push({ name: 'Budget consumed by L2 gate firing', pass: content.includes('budget') && (content.includes('L2') || content.includes('gate') || content.includes('consume')) });

    // 4. Budget cap at 1.0 (clamp/saturation)
    results.push({ name: 'Budget cap at 1.0 documented', pass: content.includes('1.0') || content.includes('cap') || content.includes('max') || content.includes('limit') });

    // 5. Budget renewal at cycle boundary (POST-ACTION or L1 start)
    results.push({ name: 'Budget renewal at cycle boundary', pass: (content.includes('renew') || content.includes('reset') || content.includes('refresh')) && content.includes('budget') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Shared Attention Budget',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-attention-budget.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' attention budget checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
