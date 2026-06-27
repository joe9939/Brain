// qc-architecture.test.js — Architecture compliance checks
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'QC: Architecture Compliance',
  run: async () => {
    const start = Date.now();
    const results = [];

    // Expected files exist
    const expectedFiles = [
      { name: 'install.js', path: config.INSTALL_SCRIPT },
      { name: 'brain-plugin.mjs', path: config.PLUGIN_FILE },
      { name: 'brain-master.md', path: config.SKILL_FILE },
      { name: 'benchmarks/run.js', path: path.join(config.BENCHMARKS_DIR, 'run.js') },
    ];
    expectedFiles.forEach(f => {
      results.push({ name: f.name + ' exists', pass: fs.existsSync(f.path) });
    });

    // brain-master.md <= 800 lines (readability)
    if (fs.existsSync(config.SKILL_FILE)) {
      const masterLines = fs.readFileSync(config.SKILL_FILE, 'utf8').split('\n').length;
      results.push({ name: 'brain-master.md <= 800 lines (' + masterLines + ')', pass: masterLines <= 800 });
    }

    // Plugin has G3 exemption for .opencode/skills/ path
    if (fs.existsSync(config.PLUGIN_FILE)) {
      const pluginContent = fs.readFileSync(config.PLUGIN_FILE, 'utf8');
      results.push({ name: 'Plugin has .opencode/skills G3 exemption', pass: pluginContent.includes('.opencode/skills') });
    }

    // source agent files exist (check a sample)
    const agentDir = path.join(config.BRAIN_AGENT_DIR, 'src', 'agents');
    if (fs.existsSync(agentDir)) {
      const agentFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
      results.push({ name: 'src/agents/ has 20 agent files (' + agentFiles.length + ')', pass: agentFiles.length >= 20 });
    }

    // MCP servers exist
    const mcpDir = config.MCP_DIR;
    if (fs.existsSync(mcpDir)) {
      const mcps = fs.readdirSync(mcpDir).filter(f => fs.statSync(path.join(mcpDir, f)).isDirectory());
      results.push({ name: 'MCP servers exist (' + mcps.length + ')', pass: mcps.length >= 3 });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All architecture compliance checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
