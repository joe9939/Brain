const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'Config Integrity',
  run: async () => {
    const start = Date.now();
    const results = [];

    // 1. opencode.json parses (check example template since actual config is at ~/.config/opencode)
    const examplePath = path.join(config.BRAIN_AGENT_DIR, 'config', 'opencode.example.json');
    if (fs.existsSync(examplePath)) {
      try {
        JSON.parse(fs.readFileSync(examplePath, 'utf8'));
        results.push({ name: 'opencode.example.json parses', pass: true });
      } catch (e) {
        results.push({ name: 'opencode.example.json parses', pass: false });
      }
    } else {
      results.push({ name: 'opencode.example.json exists', pass: false });
    }

    // 2. All agent paths exist in .opencode/agents/
    const agentDir = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'agents');
    if (fs.existsSync(agentDir)) {
      const agentFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
      const expectedAgents = ['thalamus','amygdala','hippocampus','world-cortex','safety-cortex',
        'reward-cortex','attention-cortex','basal-ganglia','cerebellum','dmn',
        'insula','hypothalamus','self-optimizer','self-enhance-cortex','offline-consolidation',
        'swarm-planner','swarm-coder','swarm-reviewer','swarm-tester','brain'];
      const missing = expectedAgents.filter(a => !agentFiles.some(f => f === a + '.md' || f.includes(a)));
      results.push({ name: 'All agent files exist (' + agentFiles.length + ')', pass: missing.length === 0 });
      if (missing.length > 0) results[results.length-1].name += ' missing: ' + missing.join(',');
    } else {
      results.push({ name: 'Agent directory exists', pass: false });
    }

    // 3. 8 MCP source directories exist (build artifacts not required for CI)
    const mcpBase = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'mcp');
    const ALL_MCPS = ['memory-store', 'world-model', 'reward-system', 'tool-tracker', 'sop-tracker', 'reflexion', 'priority-queue', 'monitor'];
    let mcpCount = 0;
    for (const m of ALL_MCPS) {
      // Check dist first (built), fall back to source dir existing
      const ok = fs.existsSync(path.join(mcpBase, m, 'dist', 'server.js')) ||
                 fs.existsSync(path.join(mcpBase, m)) ||
                 fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'src', 'mcp', m, 'dist', 'server.js')) ||
                 fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'src', 'mcp', m));
      if (ok) mcpCount++;
      results.push({ name: 'MCP ' + m + ' exists', pass: ok });
    }
    results.push({ name: '8 MCP dirs exist (' + mcpCount + '/8)', pass: mcpCount === 8 });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All ' + results.length + ' config checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
