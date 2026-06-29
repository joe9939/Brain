// install-cycle.test.js — Integration: Full install lifecycle verification
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'INTEGRATION: Install Cycle',
  run: async () => {
    const start = Date.now();
    const results = [];

    // 1. --dry-run runs and produces output (may have check failures but shouldn't crash)
    try {
      const dryRun = execSync('node install.js --dry-run', { cwd: config.BRAIN_AGENT_DIR, encoding: 'utf8', stdio: 'pipe' });
      results.push({ name: '--dry-run outputs Brain Agent header', pass: dryRun.includes('Brain Agent') });
    } catch (e) {
      // --dry-run may exit non-zero if some checks fail, but should still produce output
      const output = e.stdout || '';
      results.push({ name: '--dry-run outputs Brain Agent header', pass: output.includes('Brain Agent') });
    }

    // 2. --status runs and returns info (may exit non-zero if some checks fail)
    const statusOk = (() => {
      try {
        const out = execSync('node install.js --status', { cwd: config.BRAIN_AGENT_DIR, encoding: 'utf8', stdio: 'pipe' });
        return out.includes('Brain Agent Status');
      } catch (e) {
        return (e.stdout || '').includes('Brain Agent Status');
      }
    })();
    results.push({ name: '--status runs', pass: statusOk });

    // 3. Verify plugin files exist
    results.push({ name: 'Plugin source exists', pass: fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-hooks.mjs')) });
    results.push({ name: 'Plugin entry exists', pass: fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-plugin.mjs')) });

    // 4. Verify skill file exists
    results.push({ name: 'Skill file exists', pass: fs.existsSync(path.join(config.BRAIN_AGENT_DIR, '.opencode', 'skills', 'brain-master.md')) });

    // 5. Verify prompt files exist (count >= 15)
    const promptDir = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'prompts', 'brain');
    let promptCount = 0;
    if (fs.existsSync(promptDir)) {
      promptCount = fs.readdirSync(promptDir).filter(f => f.endsWith('.md')).length;
    }
    results.push({ name: 'Prompt files count >= 15 (' + promptCount + ')', pass: promptCount >= 15 });

    // 6. Verify MCP server src dirs exist
    const mcpBase = path.join(config.BRAIN_AGENT_DIR, 'src', 'mcp');
    const mcpNames = ['memory-store', 'world-model', 'reward-system', 'tool-tracker', 'sop-tracker', 'reflexion', 'priority-queue', 'monitor'];
    for (const m of mcpNames) {
      const mcpDir = path.join(mcpBase, m);
      results.push({ name: 'MCP src dir exists: ' + m, pass: fs.existsSync(mcpDir) });
    }

    // 7. Verify oh-my-openagent.jsonc exists
    results.push({ name: 'oh-my-openagent.jsonc exists', pass: fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'oh-my-openagent.jsonc')) });

    // 8. Verify tests/runner.js exists
    results.push({ name: 'tests/runner.js exists', pass: fs.existsSync(path.join(config.BRAIN_AGENT_DIR, 'tests', 'runner.js')) });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' install cycle checks passed'
        : 'Failed (' + failed.length + '/' + results.length + '): ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
