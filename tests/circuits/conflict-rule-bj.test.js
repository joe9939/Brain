var fs = require('fs');
var path = require('path');
var config = require('../config');

module.exports = {
  name: 'CIRCUIT: Conflict Rule B-J (CAUTION freeze)',
  run: async () => {
    var start = Date.now();
    var content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    var results = [];

    var rulesIdx = content.indexOf('### Conflict Resolution Rules');
    var rulesBlock = rulesIdx >= 0 ? content.substring(rulesIdx, rulesIdx + 600) : content;

    results.push({ name: 'Conflict Resolution Rules section exists', pass: rulesIdx >= 0 });
    results.push({ name: 'B-J rule header present', pass: rulesBlock.indexOf('(B-J)') >= 0 });
    results.push({ name: 'CAUTION freezes trait drift', pass: content.indexOf('CAUTION freezes trait drift') >= 0 });
    results.push({ name: 'Pauses DMN loop', pass: content.indexOf('pauses DMN loop') >= 0 || content.indexOf('DMN') >= 0 });
    results.push({ name: 'safety_level=CAUTION in rule text', pass: rulesBlock.indexOf('safety_level') >= 0 && rulesBlock.indexOf('CAUTION') >= 0 });

    var passed = results.every(function(r) { return r.pass; });
    var failed = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    var evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    var evidence = [
      '# Circuit: Conflict Rule B-J (CAUTION freeze)',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
    ].concat(results.map(function(r) { return '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name; }));
    if (failed.length > 0) evidence.push('', '## Failures', ...failed.map(function(f) { return '- ' + f; }));
    fs.writeFileSync(path.join(evidenceDir, 'conflict-rule-bj.md'), evidence.join('\n'));

    return {
      passed: passed,
      message: passed ? 'All ' + results.length + ' B-J rule checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
