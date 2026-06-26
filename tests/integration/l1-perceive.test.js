// l1-perceive.test.js — L1 parallel firing integration test
// Reads brain-master.md to verify L1 section structure
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'L1 Perceive Parallel Firing',
  run: async () => {
    const start = Date.now();
    const results = [];
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');

    // L1 section starts before architecture diagram
    const l1Idx = content.indexOf('## L1: PERCEIVE');
    const archIdx = content.indexOf('## L2');
    results.push({ name: 'L1 section before L2 section', pass: l1Idx > 0 && l1Idx < archIdx });

    // All 4 L1 agents present in L1 block (between L1 header and L2 header or ---)
    const l1Block = content.substring(l1Idx, archIdx > 0 ? archIdx : content.length);
    results.push({ name: 'L1 has thalamus', pass: l1Block.includes('thalamus') });
    results.push({ name: 'L1 has amygdala', pass: l1Block.includes('amygdala') });
    results.push({ name: 'L1 has hippocampus', pass: l1Block.includes('hippocampus') });
    results.push({ name: 'L1 has world-cortex', pass: l1Block.includes('world-cortex') });

    // All 4 use run_in_background=true
    const bgMatches = content.match(/run_in_background=true/g);
    results.push({ name: 'run_in_background=true found', pass: bgMatches !== null && bgMatches.length >= 4 });

    // Circuit modulation section exists
    results.push({ name: 'Circuit modulation section', pass: content.includes('Circuit modulation') });

    // L1 display format
    results.push({ name: 'PERCEIVE status display', pass: content.includes('PERCEIVE') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 8 L1 integration checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
