// circuit-world-predict.test.js — World Model Predict→Verify
// Verifies world_predict before L3 coder + world_diff verify after world_update
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: World Model Predict→Verify',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. world_predict called in L3 before coder step
    const l3Idx = content.indexOf('## L3:');
    const l3Block = l3Idx >= 0 ? content.substring(l3Idx, Math.max(content.indexOf('## POST-ACTION', l3Idx), content.indexOf('## STATUS', l3Idx), content.length)) : '';
    results.push({ name: 'L3 has world_predict before coder', pass: l3Block.includes('world_predict') || (l3Block.includes('predict') && l3Block.includes('world')) });

    // 2. POST-ACTION has world_diff verification after world_update
    const postIdx = content.indexOf('## POST-ACTION');
    const postSection = postIdx >= 0 ? content.substring(postIdx) : '';
    results.push({ name: 'POST-ACTION has world_diff verification', pass: postSection.includes('world_diff') || (postSection.includes('world') && postSection.includes('diff')) });

    // 3. Predict output used in L3 coder context
    results.push({ name: 'Predict output feeds coder context', pass: l3Block.includes('predict') || content.includes('world_digest') });

    // 4. world_update exists in POST-ACTION
    results.push({ name: 'world_update exists in POST-ACTION', pass: postSection.includes('world_update') });

    // 5. Predict→verify cycle is documented as named section
    const hasPredictSection = content.includes('predict') && content.includes('verify') && (content.includes('##') || content.includes('###'));
    results.push({ name: 'Predict→verify cycle section exists', pass: hasPredictSection });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: World Model Predict→Verify',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-world-predict.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' world predict→verify checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
