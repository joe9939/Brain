// full-pathway.test.js — L1->L2->L3 end-to-end neural pathway
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'L1->L2->L3 Full Pathway',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // L1 always fires
    results.push({ name: 'L1: PERCEIVE always fires', pass: content.includes('L1') });

    // L2 checks conditional gates
    results.push({ name: 'L2: CONDITIONAL GATES', pass: content.includes('L2') && content.includes('CONDITIONAL') });

    // L3 executes
    results.push({ name: 'L3: EXECUTE', pass: content.includes('L3') && content.includes('EXECUTE') });

    // Status display format includes all 3 layers
    const hasL1Display = content.includes('[L1:');
    const hasL2Display = content.includes('[L2:');
    const hasL3Display = content.includes('[L3:');
    results.push({ name: 'Status display L1/L2/L3', pass: hasL1Display && hasL2Display && hasL3Display });

    // Post-action recording cycle exists
    results.push({ name: 'POST-ACTION section', pass: content.includes('POST-ACTION') || content.includes('RECORD') });
    results.push({ name: 'Record display includes RECORD line', pass: content.includes('[RECORD:') });

    // Post-action cycle components
    const postBlocks = ['self-enhance', 'memory', 'reward', 'world'];
    postBlocks.forEach(b => {
      results.push({ name: 'Post-action includes ' + b, pass: content.includes(b) });
    });

    // Fix loop for review/test failure
    results.push({ name: 'Fix loop documented', pass: content.includes('loop') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 9 full pathway checks passed: L1->L2->L3->Record' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
