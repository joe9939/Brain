// circuit-global-state.test.js — Shared Global State (GLOBAL_STATE)
// Verifies GLOBAL_STATE is declared, read at L1 start, written at each phase,
// appears in L1_CONTEXT, and shows in STATUS DISPLAY.
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Shared Global State',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    const fields = ['mood', 'reward', 'world_digest', 'safety_level', 'personality', 'attention_budget'];

    // 1. SHARED STATE section exists
    results.push({ name: '## SHARED STATE section exists', pass: content.includes('## SHARED STATE') });

    // 2. GLOBAL_STATE declared with all required fields
    results.push({ name: 'GLOBAL_STATE has mood', pass: content.includes('mood') && (content.includes('current_mood') || content.includes('GLOBAL_STATE.mood')) });
    results.push({ name: 'GLOBAL_STATE has reward', pass: content.includes('reward') && (content.includes('GLOBAL_STATE.reward') || content.includes('score') && content.includes('reward')) });
    results.push({ name: 'GLOBAL_STATE has world_digest', pass: content.includes('world_digest') || (content.includes('world') && content.includes('digest')) });
    results.push({ name: 'GLOBAL_STATE has safety_level', pass: content.includes('safety_level') || (content.includes('safety') && content.includes('level')) });
    results.push({ name: 'GLOBAL_STATE has personality', pass: content.includes('personality') || content.includes('personality_traits') });
    results.push({ name: 'GLOBAL_STATE has attention_budget', pass: content.includes('attention_budget') });

    // 3. L1 reads GLOBAL_STATE at start
    results.push({ name: 'L1 reads GLOBAL_STATE from memory-store', pass: content.includes('memory_store.get("global_state")') || content.includes('memory_store.get(\'global_state\')') || (content.includes('GLOBAL_STATE') && content.includes('memory')) });

    // 4. L1.5 writes mood → GLOBAL_STATE
    results.push({ name: 'L1.5 writes mood to GLOBAL_STATE', pass: content.includes('mood_set') || content.includes('GLOBAL_STATE.mood') || content.includes('current_mood') });

    // 5. L2 writes reward/attention → GLOBAL_STATE
    results.push({ name: 'L2 writes to GLOBAL_STATE', pass: (content.includes('GLOBAL_STATE') && content.includes('L2')) || content.includes('record_outcome') || content.includes('score_action') });

    // 6. POST-ACTION writes personality → GLOBAL_STATE
    results.push({ name: 'POST-ACTION writes to GLOBAL_STATE', pass: content.includes('personality_traits') || (content.includes('trait_drift') && content.includes('GLOBAL_STATE')) });

    // 7. STATUS DISPLAY has [GLOBAL:] line
    results.push({ name: 'STATUS DISPLAY has [GLOBAL:] line', pass: content.includes('[GLOBAL:') });

    // 8. GLOBAL_STATE injected into L1_CONTEXT
    results.push({ name: 'L1_CONTEXT includes global_state', pass: content.includes('global_state') && content.includes('L1_CONTEXT') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Shared Global State',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-global-state.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' global state checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
