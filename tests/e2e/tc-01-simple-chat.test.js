// tc-01-simple-chat.test.js — Simple chat L1 trigger test
// Verifies brain-master.md fires L1 5-way parallel on every message
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'TC-01: Simple Chat L1 Trigger',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');

    const results = [];

    // L1 must fire on every message (mandatory)
    results.push({ name: 'L1 fires on every message', pass: content.includes('MANDATORY on EVERY') });

    // 5 parallel background tasks
    const bgCount = (content.match(/run_in_background=true/g) || []).length;
    results.push({ name: '5 parallel background tasks', pass: bgCount >= 5 });

    // All 5 agents present in prompt
    const agents = ['brain-thalamus', 'brain-amygdala', 'brain-hippocampus', 'brain-world-cortex', 'brain-safety'];
    agents.forEach(a => {
      results.push({ name: 'Agent ' + a + ' present', pass: content.includes(a) });
    });

    // Wait for all 5
    results.push({ name: 'Wait for all 5 L1 agents', pass: content.includes('Wait for ALL') });

    // Status display per message
    results.push({ name: 'Status display per message', pass: content.includes('STATUS DISPLAY') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All TC-01 checks passed: L1 fires 5-way on every message' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
