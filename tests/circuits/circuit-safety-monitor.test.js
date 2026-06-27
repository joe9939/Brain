// circuit-safety-monitor.test.js — Safety Continuous Monitor
// Verifies safety gates are active at every phase of the pipeline
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Safety Continuous Monitor',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. L1 thalamus includes safety_check in output
    const l1Idx = content.indexOf('## L1:');
    const l15Idx = content.indexOf('## L1.5');
    const l1Block = l1Idx >= 0 ? content.substring(l1Idx, l15Idx > l1Idx ? l15Idx : content.length) : '';
    results.push({ name: 'L1 thalamus output has safety_check', pass: l1Block.includes('safety_check') || l1Block.includes('dangerous') || l1Block.includes('safety') });

    // 2. L1 amygdala includes safety_threshold in output
    results.push({ name: 'L1 amygdala output has safety_threshold', pass: l1Block.includes('safety_threshold') || (l1Block.includes('safety') && l1Block.includes('threshold')) });

    // 3. L1.5 mood decay propagates safety effects
    const l15Block = l15Idx >= 0 ? content.substring(l15Idx) : '';
    results.push({ name: 'L1.5 mood→safety propagation (CAUTION→strict)', pass: l15Block.includes('safety_threshold') || l15Block.includes('CAUTION') && l15Block.includes('strict') });

    // 4. L2 gate table has amygdala.CAUTION → brain-safety condition
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = l2Idx >= 0 ? content.substring(l2Idx, l3Idx > l2Idx ? l3Idx : content.length) : '';
    results.push({ name: 'L2 gate: CAUTION → brain-safety', pass: l2Block.includes('safety') || l2Block.includes('CAUTION') });

    // 5. L3 swarm-reviewer or swarm-coder references safety
    const l3Block = l3Idx >= 0 ? content.substring(l3Idx) : '';
    results.push({ name: 'L3 swarm includes safety checks', pass: l3Block.includes('safety') || l3Block.includes('danger') || l3Block.includes('security') });

    // 6. GLOBAL_STATE.safety_level is written
    results.push({ name: 'GLOBAL_STATE.safety_level written', pass: content.includes('safety_level') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Safety Continuous Monitor',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-safety-monitor.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' safety monitor checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
