// circuit-homeostasis.test.js — Homeostasis Circuit
// Verifies monitor→insula→corrective action mechanism
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Homeostasis',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // Find L2 block
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = l2Idx >= 0 ? content.substring(l2Idx, l3Idx > l2Idx ? l3Idx : content.length) : '';

    // 1. Insula trigger in L2 gate table
    results.push({ name: 'L2 gate table has insula trigger', pass: l2Block.includes('insula') || l2Block.includes('monitor_') });

    // 2. Homeostasis section exists
    results.push({ name: 'Homeostasis section exists', pass: content.includes('Homeostasis') || content.includes('homeostasis') });

    // 3. Corrective actions are non-destructive
    const hasNonDestructive = content.includes('reduce') || content.includes('throttle') || content.includes('limit') || content.includes('thresh');
    const hasDestructive = content.includes(' shutdown ') || content.includes(' terminate ') || content.includes(' kill ') || content.includes('\\nshutdown') || content.includes('\\nkill');
    results.push({ name: 'Corrective actions are non-destructive', pass: hasNonDestructive && !hasDestructive });

    // 4. Corrective actions bounded — no auto-shutdown
    results.push({ name: 'No auto-shutdown or destructive corrective actions', pass: !hasDestructive });

    // 5. HOMEOSTASIS status display line
    results.push({ name: 'STATUS DISPLAY has [HOMEOSTASIS:] line', pass: content.includes('[HOMEOSTASIS:') || (content.includes('STATUS') && content.includes('homeostasis')) });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Homeostasis',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-homeostasis.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' homeostasis checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
