const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'OMO Config Structure',
  run: async () => {
    const start = Date.now();
    const results = [];
    const ohmPath = path.join(config.BRAIN_AGENT_DIR, 'oh-my-openagent.jsonc');
    if (!fs.existsSync(ohmPath)) {
      return { passed: false, message: 'oh-my-openagent.jsonc not found', time_ms: Date.now() - start };
    }
    const raw = fs.readFileSync(ohmPath, 'utf8');

    // stripJsoncComments (simplified)
    function stripJsoncComments(text) {
      var result = '';
      var inString = false;
      var i = 0;
      while (i < text.length) {
        var c = text[i];
        var next = text[i + 1] || '';
        if (inString) {
          result += c;
          if (c === '\\' && (next === '"' || next === '\\' || next === '/' || next === 'n' || next === 't')) {
            result += next; i += 2; continue;
          }
          if (c === '"') inString = false;
          i++; continue;
        }
        if (c === '"') { inString = true; result += c; i++; continue; }
        if (c === '/' && next === '/') { while (i < text.length && text[i] !== '\n') i++; if (i < text.length) result += '\n'; i++; continue; }
        if (c === '/' && next === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i+1] === '/')) i++; i += 2; continue; }
        result += c; i++;
      }
      result = result.replace(/,(\s*[}\]])/g, '$1');
      return result;
    }

    try {
      const clean = stripJsoncComments(raw);
      const parsed = JSON.parse(clean);
      const cats = parsed.categories || {};

      // 1. Has 20+ brain categories (including built-in overrides)
      const brainCats = Object.keys(cats).filter(k => k.startsWith('brain-'));
      results.push({ name: 'Brain categories >= 20 (' + brainCats.length + ')', pass: brainCats.length >= 20 });

      // 2. Each brain category has model
      const noModel = brainCats.filter(k => !cats[k].model);
      results.push({ name: 'All brain cats have model', pass: noModel.length === 0 });

      // 3. Each brain category has valid structure (model + variant + description)
      const validStructure = brainCats.filter(k => !cats[k].model || !cats[k].variant || !cats[k].description);
      results.push({ name: 'All brain cats have valid structure', pass: validStructure.length === 0 });

      // 4. brain_mode is enabled
      results.push({ name: 'brain_mode enabled', pass: parsed.brain_mode?.enabled === true });

      // 5. team_mode has lead + members
      results.push({ name: 'team_mode has lead', pass: !!parsed.team_mode?.lead });
      results.push({ name: 'team_mode has members', pass: Array.isArray(parsed.team_mode?.members) && parsed.team_mode.members.length > 0 });

      // 6. ulw-loop command
      results.push({ name: 'ulw-loop command', pass: parsed.commands?.['ulw-loop']?.agent === 'brain-consolidation' });

      const passed = results.every(r => r.pass);
      const failed = results.filter(r => !r.pass).map(r => r.name);
      return {
        passed,
        message: passed ? 'All ' + results.length + ' OMO config checks passed' : 'Failed: ' + failed.join(', '),
        time_ms: Date.now() - start,
      };
    } catch (e) {
      return { passed: false, message: 'JSON parse error: ' + e.message, time_ms: Date.now() - start };
    }
  },
};
