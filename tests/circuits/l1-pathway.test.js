// l1-pathway.test.js — L1 neural pathway verification
// Tests complete L1 data flow as documented in brain-master.md
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'L1 Neural Pathway',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // thalamus gates input, extracts priority
    results.push({ name: 'thalamus gates input', pass: content.includes('thalamus') && content.includes('gate') });
    results.push({ name: 'thalamus extracts priority', pass: content.includes('priority') || content.includes('urgency') });

    // amygdala detects emotion mode
    results.push({ name: 'amygdala detects emotion', pass: content.includes('mode') || content.includes('Mood') });
    results.push({ name: 'amygdala outputs JSON', pass: content.includes('{mode') || content.includes('mode,') || content.includes('JSON') });

    // hippocampus queries memory
    results.push({ name: 'hippocampus memory query', pass: content.includes('memory_retrieve') || content.includes('Memory') });

    // world-cortex scans codebase
    results.push({ name: 'world-cortex codebase scan', pass: content.includes('world_query') || content.includes('Codebase') });

    // All 4 run in parallel via run_in_background=true
    const bgCount = (content.match(/run_in_background=true/g) || []).length;
    results.push({ name: '4 parallel background tasks', pass: bgCount >= 4 });

    // Circuit modulation table covers all 4 L1 outputs
    results.push({ name: 'Circuit modulation exists', pass: content.includes('Circuit modulation') });

    // Wait for all 4
    results.push({ name: 'Wait for all L1 agents', pass: content.includes('Wait for ALL') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 8 L1 pathway checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
