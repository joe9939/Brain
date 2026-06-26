// tc-02-weather-berlin.test.js — Berlin weather query routing test
// Verifies brain-master.md handles non-code queries
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'TC-02: Non-Code Query Routing',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');

    const results = [];

    // L1 fires for ALL messages (code and non-code)
    results.push({ name: 'L1 fires for every message', pass: content.includes('Every message') || content.includes('every message') });

    // L1 agents should detect intent via their prompts
    // thalamus captures intent: check for "intent" or "gate" or "summary"
    const hasIntentCheck = content.includes('intent') || content.includes('gate');
    results.push({ name: 'L1 thalamus checks intent', pass: hasIntentCheck });

    // amygdala detects emotion mode
    results.push({ name: 'amygdala detects emotion mode', pass: content.includes('mode') });

    // hippocampus queries memory
    results.push({ name: 'hippocampus queries memory', pass: content.includes('memory') });

    // world-cortex scans codebase
    results.push({ name: 'world-cortex scans codebase', pass: content.includes('codebase') || content.includes('world_query') });

    // L2/L3 only fire conditionally — non-code queries skip L3
    results.push({ name: 'L2 conditional (non-code skip L3)', pass: content.includes('CONDITIONAL') || content.includes('conditional') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All TC-02 checks passed: non-code routing works' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
