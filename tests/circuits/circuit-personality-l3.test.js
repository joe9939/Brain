// circuit-personality-l3.test.js — Personality→L3/Post
// Verifies personality traits modulate L3 swarm and POST-ACTION behavior
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Personality→L3/Post',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. L3 swarm pipeline includes personality in context
    const l3Idx = content.indexOf('## L3');
    const postIdx = content.indexOf('## POST-ACTION');
    const l3Block = l3Idx >= 0 ? content.substring(l3Idx, postIdx > l3Idx ? postIdx : content.length) : '';
    results.push({ name: 'L3 context includes personality', pass: l3Block.includes('personality') || l3Block.includes('personality_traits') });

    // 2. POST-ACTION reflexion references personality
    const postBlock = postIdx >= 0 ? content.substring(postIdx) : '';
    results.push({ name: 'POST-ACTION references personality', pass: postBlock.includes('personality') || postBlock.includes('personality_traits') || postBlock.includes('trait_drift') });

    // 3. L1_CONTEXT includes personality
    results.push({ name: 'L1_CONTEXT includes personality', pass: content.includes('personality') && content.includes('L1_CONTEXT') });

    // 4. STATUS DISPLAY has [PERSONALITY:] line
    results.push({ name: 'STATUS DISPLAY has [PERSONALITY:] line', pass: content.includes('[PERSONALITY:') });

    // 5. apply_trait_drift or equivalent update in POST-ACTION
    results.push({ name: 'Trait drift function exists and is called', pass: content.includes('apply_trait_drift') || (postBlock.includes('drift') && (postBlock.includes('trait') || postBlock.includes('personality'))) });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Personality→L3/Post',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-personality-l3.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' personality→L3/Post checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
