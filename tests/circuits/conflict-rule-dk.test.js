var fs = require('fs');
var path = require('path');
var config = require('../config');

module.exports = {
  name: 'CIRCUIT: Conflict Rule D-K (attention_budget)',
  run: async () => {
    var start = Date.now();
    var content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    var results = [];

    // Find conflict rules section
    var rulesIdx = content.indexOf('### Conflict Resolution Rules');
    var rulesBlock = rulesIdx >= 0 ? content.substring(rulesIdx, rulesIdx + 600) : content;

    results.push({ name: 'Conflict Resolution Rules section exists', pass: rulesIdx >= 0 });
    results.push({ name: 'D-K rule header present', pass: rulesBlock.indexOf('(D-K)') >= 0 });
    results.push({ name: 'attention_budget is outer cap mentioned', pass: content.indexOf('attention_budget is outer cap') >= 0 });
    results.push({ name: 'D-K formula uses min() with attention_budget.remaining', pass: content.indexOf('attention_budget.remaining') >= 0 && content.indexOf('min(') >= 0 });
    results.push({ name: 'reward modulation mentioned in context', pass: content.indexOf('reward modulation') >= 0 && content.indexOf('attention_budget') >= 0 });
    results.push({ name: 'Formula has multiply factor (1.2)', pass: content.indexOf('* 1.2') >= 0 || content.indexOf('*1.2') >= 0 });
    results.push({ name: 'Cap is budget remaining', pass: rulesBlock.indexOf('remaining') >= 0 && rulesBlock.indexOf('budget') >= 0 });

    var passed = results.every(function(r) { return r.pass; });
    var failed = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    var evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    var evidence = [
      '# Circuit: Conflict Rule D-K (attention_budget)',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
    ].concat(results.map(function(r) { return '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name; }));
    if (failed.length > 0) evidence.push('', '## Failures', ...failed.map(function(f) { return '- ' + f; }));
    fs.writeFileSync(path.join(evidenceDir, 'conflict-rule-dk.md'), evidence.join('\n'));

    return {
      passed: passed,
      message: passed ? 'All ' + results.length + ' D-K rule checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
