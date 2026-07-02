var fs = require('fs');
var path = require('path');
var config = require('../config');

module.exports = {
  name: 'C10: conflict rules',
  run: async () => {
    var start = Date.now();
    var content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    var results = [];

    var rulesIdx = content.indexOf('### Conflict Resolution Rules');
    results.push({ name: 'Conflict Resolution Rules section exists', pass: rulesIdx >= 0 });
    var rulesBlock = rulesIdx >= 0 ? content.substring(rulesIdx, rulesIdx + 1000) : content;

    // D-K: attention_budget is outer cap
    results.push({ name: 'D-K rule header present', pass: content.indexOf('(D-K)') >= 0 });
    results.push({ name: 'D-K: attention_budget is outer cap', pass: content.indexOf('attention_budget is outer cap') >= 0 });
    results.push({ name: 'D-K: formula uses min() with attention_budget.remaining', pass: content.indexOf('min(') >= 0 && content.indexOf('attention_budget.remaining') >= 0 });
    results.push({ name: 'D-K: reward modulation mentioned', pass: content.indexOf('reward modulation') >= 0 && content.indexOf('attention_budget') >= 0 });

    // B-J: safety=CAUTION freezes trait drift
    results.push({ name: 'B-J rule header present', pass: content.indexOf('(B-J)') >= 0 });
    results.push({ name: 'B-J: CAUTION freezes trait drift', pass: content.indexOf('CAUTION freezes trait drift') >= 0 });
    results.push({ name: 'B-J: pauses DMN loop', pass: content.indexOf('pauses DMN loop') >= 0 || (content.indexOf('DMN') >= 0 && content.indexOf('CAUTION') >= 0) });
    results.push({ name: 'B-J: safety_level=CAUTION in rule text', pass: rulesBlock.indexOf('safety_level') >= 0 && rulesBlock.indexOf('CAUTION') >= 0 });

    // H-I: threshold = personality_base + mood_offset, clamped
    results.push({ name: 'H-I rule header present', pass: content.indexOf('(H-I)') >= 0 });
    results.push({ name: 'H-I: threshold formula present', pass: content.indexOf('threshold = personality_base + mood_offset') >= 0 });
    results.push({ name: 'H-I: uses personality_base', pass: content.indexOf('personality_base') >= 0 });
    results.push({ name: 'H-I: uses mood_offset', pass: content.indexOf('mood_offset') >= 0 });
    results.push({ name: 'H-I: clamped [0.0, 1.0] present', pass: content.indexOf('[0.0, 1.0]') >= 0 || (content.indexOf('clamped') >= 0 && content.indexOf('0.0') >= 0 && content.indexOf('1.0') >= 0) });

    var passed = results.every(function(r) { return r.pass; });
    var failed = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    var evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    var evidence = [
      '# C10: Conflict Rules',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
    ].concat(results.map(function(r) { return '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name; }));
    if (failed.length > 0) evidence.push('', '## Failures', ...failed.map(function(f) { return '- ' + f; }));
    fs.writeFileSync(path.join(evidenceDir, 'c10-conflict.md'), evidence.join('\n'));

    return {
      passed: passed,
      message: passed ? 'All ' + results.length + ' C10 conflict rule checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};

if (require.main === module) {
  module.exports.run().then(function(r) { console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); });
}
