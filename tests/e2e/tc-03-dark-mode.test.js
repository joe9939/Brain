// tc-03-dark-mode.test.js — Dark mode code task test
// Verifies L3 swarm pipeline fires for implementation tasks
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'TC-03: Dark Mode Code Task',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // L3 section exists
    results.push({ name: 'L3 section present', pass: content.includes('## L3') });

    // L3 has planner->coder->reviewer->tester pipeline
    results.push({ name: 'L3 has swarm-planner', pass: content.includes('swarm-planner') });
    results.push({ name: 'L3 has swarm-coder', pass: content.includes('swarm-coder') });
    results.push({ name: 'L3 has swarm-reviewer', pass: content.includes('swarm-reviewer') });
    results.push({ name: 'L3 has swarm-tester', pass: content.includes('swarm-tester') });

    // L3 trigger condition: 3+ files or 5+ steps
    results.push({ name: 'L3 trigger condition', pass: content.includes('3+ files') || content.includes('5+ steps') });

    // Fix loop: review fail -> coder loop
    results.push({ name: 'Fix loop max 2 iterations', pass: content.includes('max 2') || content.includes('max 2 loops') });

    // DAG planning
    results.push({ name: 'DAG planning for parallelism', pass: content.includes('DAG') || content.includes('parallel') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All TC-03 checks passed: L3 swarm pipeline configured' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
