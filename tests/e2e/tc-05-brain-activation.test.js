// tc-05-brain-activation.test.js — Brain mode activation test
// Verifies brain agent is configured in opencode.json and files exist
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'TC-05: Brain Mode Activation',
  run: async () => {
    const start = Date.now();
    const results = [];

    // Check opencode.json brain agent
    if (fs.existsSync(config.OPCODE_CONFIG)) {
      const cfg = JSON.parse(fs.readFileSync(config.OPCODE_CONFIG, 'utf8'));
      results.push({ name: 'Brain agent in opencode.json', pass: cfg.agent && cfg.agent.brain && cfg.agent.brain.mode === 'primary' });
    } else {
      results.push({ name: 'Brain agent in opencode.json', pass: false });
    }

    // brain-master.md exists
    results.push({ name: 'brain-master.md exists', pass: fs.existsSync(config.SKILL_FILE) });

    // brain-plugin.mjs exists and loads
    results.push({ name: 'brain-plugin.mjs exists', pass: fs.existsSync(config.PLUGIN_FILE) });

    // Plugin exports BrainPlugin
    try {
      const pluginContent = fs.readFileSync(config.PLUGIN_FILE, 'utf8');
      results.push({ name: 'Plugin exports BrainPlugin', pass: pluginContent.includes('BrainPlugin') });
    } catch (e) {
      results.push({ name: 'Plugin exports BrainPlugin', pass: false });
    }

    // opencode.json has task/skill/todowrite permissions for brain
    try {
      const cfg = JSON.parse(fs.readFileSync(config.OPCODE_CONFIG, 'utf8'));
      const brain = cfg.agent && cfg.agent.brain;
      const hasPerms = brain && brain.permission &&
        brain.permission.task === 'allow' &&
        brain.permission.skill === 'allow' &&
        brain.permission.todowrite === 'allow';
      results.push({ name: 'Brain agent has task/skill/todowrite permissions', pass: hasPerms });
    } catch (e) {
      results.push({ name: 'Brain agent has task/skill/todowrite permissions', pass: false });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All TC-05 checks passed: brain mode activated' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
