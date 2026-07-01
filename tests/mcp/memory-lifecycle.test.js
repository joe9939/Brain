const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'MCP: Memory Lifecycle Keywords',
  run: async () => {
    const start = Date.now();
    const results = [];
    const skillFile = config.SKILL_FILE;

    if (!fs.existsSync(skillFile)) {
      return { passed: false, message: 'brain-master.md not found at ' + skillFile, time_ms: Date.now() - start };
    }

    const content = fs.readFileSync(skillFile, 'utf8');
    const keywords = [
      { term: 'decay', label: 'Memory decay lifecycle' },
      { term: 'consolidate', label: 'Memory consolidation' },
      { term: 'detect_conflicts', label: 'Conflict detection' },
      { term: 'resolve', label: 'Conflict resolution' },
      { term: 'flagged', label: 'Flagged memory handling' },
      { term: 'memory_decay', label: 'memory_decay tool reference' },
      { term: 'memory_consolidate', label: 'memory_consolidate tool reference' },
      { term: 'memory_detect_conflicts', label: 'memory_detect_conflicts tool' },
      { term: 'memory_resolve', label: 'memory_resolve tool' },
    ];

    for (const kw of keywords) {
      const found = content.includes(kw.term);
      results.push({ name: kw.label + ' (' + kw.term + ')', pass: found });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All ' + results.length + ' memory lifecycle keywords found' : 'Missing: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
