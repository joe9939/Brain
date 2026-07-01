var fs = require('fs');
var path = require('path');
var config = require('../config');

module.exports = {
  name: 'CIRCUIT: Conflict Rule H-I (threshold clamp)',
  run: async () => {
    var start = Date.now();
    var content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    var results = [];

    var rulesIdx = content.indexOf('### Conflict Resolution Rules');
    var rulesBlock = rulesIdx >= 0 ? content.substring(rulesIdx, rulesIdx + 600) : content;

    results.push({ name: 'Conflict Resolution Rules section exists', pass: rulesIdx >= 0 });
    results.push({ name: 'H-I rule header present', pass: rulesBlock.indexOf('(H-I)') >= 0 });
    results.push({ name: 'threshold formula present', pass: content.indexOf('threshold = personality_base + mood_offset') >= 0 });
    results.push({ name: 'Formula uses personality_base', pass: content.indexOf('personality_base') >= 0 });
    results.push({ name: 'Formula uses mood_offset', pass: content.indexOf('mood_offset') >= 0 });
    results.push({ name: 'Clamped notation [0.0, 1.0] present', pass: content.indexOf('[0.0, 1.0]') >= 0 || content.indexOf('clamped') >= 0 && content.indexOf('0.0') >= 0 && content.indexOf('1.0') >= 0 });

    var passed = results.every(function(r) { return r.pass; });
    var failed = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    var evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    var evidence = [
      '# Circuit: Conflict Rule H-I (threshold clamp)',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
    ].concat(results.map(function(r) { return '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name; }));
    if (failed.length > 0) evidence.push('', '## Failures', ...failed.map(function(f) { return '- ' + f; }));
    fs.writeFileSync(path.join(evidenceDir, 'conflict-rule-hi.md'), evidence.join('\n'));

    return {
      passed: passed,
      message: passed ? 'All ' + results.length + ' H-I rule checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
