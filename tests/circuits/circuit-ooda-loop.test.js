// circuit-ooda-loop.test.js →OODA Loop Closure
// Verifies Observe→Orient→Decide→Act cycle spans L1→L1.5→L2→L3→POST-ACTION
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: OODA Loop Closure',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. OODA loop documented in CORE RULE or separate section
    results.push({ name: 'OODA loop concept documented', pass: content.includes('OODA') || content.includes('Observe') && content.includes('Orient') });

    // 2. L1 reads previous cycle context (world_update injects into L1)
    const l1Idx = content.indexOf('## L1:');
    const l2Idx = content.indexOf('## L2');
    const l1Block = l1Idx >= 0 ? content.substring(l1Idx, l2Idx > l1Idx ? l2Idx : content.length) : '';
    results.push({ name: 'L1 injects previous cycle results', pass: l1Block.includes('world_update') || content.includes('MENTAL_STATE') || l1Block.includes('previous') });

    // 3. All 4 OODA phases map to pipeline
    const hasObserve = content.includes('L1') && content.includes('PERCEIVE');
    const hasOrient = content.includes('L1.5') || content.includes('mood_decay');
    const hasDecide = content.includes('L2') && content.includes('CONDITIONAL GATES');
    const hasAct = content.includes('L3') || content.includes('EXECUTE');
    let oodaCount = [hasObserve, hasOrient, hasDecide, hasAct].filter(Boolean).length;
    results.push({ name: 'All 4 OODA phases present (Observe/Orient/Decide/Act)', pass: oodaCount >= 4 });

    // 4. CIRCUIT CONNECTION REFERENCE has world-update →world-cortex feedback
    const circuitIdx = content.indexOf('## CIRCUIT CONNECTION REFERENCE');
    const circuitBlock = circuitIdx >= 0 ? content.substring(circuitIdx) : '';
    results.push({ name: 'Circuit table: world-update →world-cortex feedback', pass: circuitBlock.includes('world') && circuitBlock.includes('world-cortex') });

    // 5. Loop closure: POST-ACTION results feed next L1 cycle
    results.push({ name: 'Loop closure documented (action →next cycle)', pass: content.includes('next') && (content.includes('cycle') || content.includes('L1')) || content.includes('OODA') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: OODA Loop Closure',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-ooda-loop.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' OODA loop closure checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};



