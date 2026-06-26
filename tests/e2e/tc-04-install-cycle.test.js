// tc-04-install-cycle.test.js — Install/uninstall cycle test
// DANGEROUS: runs real install/uninstall. Only runs with --dangerous flag.
const { execSync } = require('child_process');
const config = require('../config');

module.exports = {
  name: 'TC-04: Install/Uninstall Cycle',
  run: async () => {
    const start = Date.now();
    if (!process.argv.includes('--dangerous')) {
      return { passed: true, message: 'SKIPPED (pass --dangerous to run real install/uninstall)', time_ms: 0 };
    }

    const results = [];
    // Use spawn-like handling: capture output even on non-zero exit
    function runCmd(cmd, label) {
      try {
        const out = execSync(cmd, { cwd: config.BRAIN_AGENT_DIR, encoding: 'utf8', timeout: 60000, stdio: 'pipe' });
        return { pass: true, output: out, exitCode: 0 };
      } catch (e) {
        return { pass: false, output: e.stdout || '', error: e.stderr || e.message, exitCode: e.status ?? 1 };
      }
    }

    // Step 1: Install
    const install1 = runCmd('node install.js', 'first install');
    results.push({ name: 'Install exits 0', pass: install1.exitCode === 0 });

    // Step 2: Status check (status exits 1 when team_mode disabled — expected)
    if (install1.pass) {
      const status1 = runCmd('node install.js --status', 'status after install');
      // Status exits non-zero when team_mode disabled (expected), but output should show most checks pass
      const hasPlugin = status1.output.includes('brain-plugin') || status1.output.includes('Plugin');
      const hasMaster = status1.output.includes('brain-master') || status1.output.includes('Skill');
      const hasAgents = status1.output.includes('Agents');
      const hasPrompts = status1.output.includes('Prompts');
      const hasTeamModeWarn = status1.output.includes('Team mode') || status1.output.includes('team_mode');
      results.push({ name: 'Status: plugin present', pass: hasPlugin });
      results.push({ name: 'Status: skill present', pass: hasMaster });
      results.push({ name: 'Status: agents present', pass: hasAgents });
      results.push({ name: 'Status: prompts present', pass: hasPrompts });
      // team_mode disabled is expected — warn but don't fail
      if (hasTeamModeWarn) {
        results.push({ name: 'Status: team_mode (expected disabled)', pass: true });
      }
    }

    // Step 3: Uninstall
    const uninstall = runCmd('node install.js --uninstall', 'uninstall');
    results.push({ name: 'Uninstall exits 0', pass: uninstall.exitCode === 0 });

    // Step 4: Verify uninstall cleaned up
    const checkUninstall = runCmd('node install.js --status', 'status after uninstall');
    // After uninstall, status should show fewer agents and no plugin
    const agentDir = config.BRAIN_AGENT_DIR + '/.opencode/agents';
    const hasPluginAfter = checkUninstall.output.includes('Plugin');
    results.push({ name: 'Uninstall: plugin removed', pass: !hasPluginAfter });

    // Step 5: Reinstall
    const install2 = runCmd('node install.js', 'second install');
    results.push({ name: 'Reinstall exits 0', pass: install2.exitCode === 0 });

    // Step 6: Final status
    if (install2.pass) {
      const status2 = runCmd('node install.js --status', 'status after reinstall');
      // After reinstall, key checks should pass
      const hasPlugin2 = status2.output.includes('brain-plugin') || status2.output.includes('Plugin');
      const hasMaster2 = status2.output.includes('brain-master') || status2.output.includes('Skill');
      const hasAgents2 = status2.output.includes('Agents');
      const hasPrompts2 = status2.output.includes('Prompts');
      results.push({ name: 'Reinstall: plugin present', pass: hasPlugin2 });
      results.push({ name: 'Reinstall: skill present', pass: hasMaster2 });
      results.push({ name: 'Reinstall: agents present', pass: hasAgents2 });
      results.push({ name: 'Reinstall: prompts present', pass: hasPrompts2 });
    }

    // Check opencode.json for brain agent config
    try {
      const opencodeConfig = JSON.parse(
        require('fs').readFileSync(require('path').join(require('os').homedir(), '.config', 'opencode', 'opencode.json'), 'utf8')
      );
      const hasBrainAgent = opencodeConfig.agent?.brain?.mode === 'primary';
      results.push({ name: 'opencode.json: brain agent configured', pass: !!hasBrainAgent });
    } catch(e) {
      results.push({ name: 'opencode.json: brain agent configured', pass: false });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All TC-04 install cycle checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
