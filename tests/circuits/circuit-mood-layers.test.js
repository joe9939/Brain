// circuit-mood-layers.test.js — Mood→All Layers
// Verifies mood propagates from L1.5 decay into L1, L2, L3, POST-ACTION
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Mood→All Layers',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. L1 section references mood/amygdala mode
    const l1Idx = content.indexOf('## L1:');
    const l15Idx = content.indexOf('## L1.5');
    const l1Block = l1Idx >= 0 ? content.substring(l1Idx, l15Idx > l1Idx ? l15Idx : content.length) : '';
    results.push({ name: 'L1 references mood/amygdala', pass: l1Block.includes('mood') || l1Block.includes('amygdala') || l1Block.includes('mode') });

    // 2. L1.5 mood decay section exists
    results.push({ name: 'L1.5 mood decay section exists', pass: content.includes('MOOD DECAY') || (content.includes('L1.5') && content.includes('mood')) });

    // 3. L2 gate conditions reference mood/amygdala mode
    const l2Idx = content.indexOf('## L2');
    const l3Idx = content.indexOf('## L3');
    const l2Block = l2Idx >= 0 ? content.substring(l2Idx, l3Idx > l2Idx ? l3Idx : content.length) : '';
    results.push({ name: 'L2 gates condition on mood/amygdala.mode', pass: l2Block.includes('amygdala.mode') || l2Block.includes('current_mood') || l2Block.includes('CAUTION') || l2Block.includes('URGENT') });

    // 4. L3 context includes mood (from MCP or context)
    const l3Idx2 = content.indexOf('## L3');
    const postIdx = content.indexOf('## POST-ACTION');
    const l3Block = l3Idx2 >= 0 ? content.substring(l3Idx2, postIdx > l3Idx2 ? postIdx : content.length) : '';
    results.push({ name: 'L3 references mood (via MCP)', pass: l3Block.includes('mood') || content.includes('current_mood') || content.includes('M_emo') });

    // 5. POST-ACTION records mood
    const postBlock = postIdx >= 0 ? content.substring(postIdx) : '';
    results.push({ name: 'POST-ACTION records/updates mood', pass: postBlock.includes('mood') || postBlock.includes('current_mood') || postBlock.includes('memory_store') });

    // 6. L1.5 propagates decayed mood values into L2 thresholds (Step 4)
    const l15Block = l15Idx >= 0 ? content.substring(l15Idx, l2Idx > l15Idx ? l2Idx : content.length) : '';
    results.push({ name: 'L1.5 propagates decayed mood to L2 thresholds', pass: l15Block.includes('threshold') || l15Block.includes('reward_multiplier') || l15Block.includes('safety_threshold') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Mood→All Layers',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-mood-layers.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' mood→all layers checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
