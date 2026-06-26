// tc-06-runtime-brain.test.js — Runtime brain mode verification
// LIVE test — only runs with --live flag. Runs opencode CLI to verify brain mode activates.
const { execSync } = require('child_process');
const config = require('../config');

module.exports = {
  name: 'TC-06: Runtime Brain Mode',
  run: async () => {
    const start = Date.now();
    if (!process.argv.includes('--live')) {
      return { passed: true, message: 'SKIPPED (pass --live to run runtime brain mode test)', time_ms: 0 };
    }

    const results = [];

    // Check if opencode CLI is available
    let opencodeAvailable = false;
    try {
      execSync('where opencode', { encoding: 'utf8', timeout: 5000, stdio: 'pipe' });
      opencodeAvailable = true;
    } catch (e) {
      try {
        execSync('Get-Command opencode -ErrorAction SilentlyContinue', {
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe',
          shell: 'powershell',
        });
        opencodeAvailable = true;
      } catch (e2) {
        opencodeAvailable = false;
      }
    }

    if (!opencodeAvailable) {
      // Try node-based detection
      try {
        const which = execSync('node -e "console.log(process.execPath)"', { encoding: 'utf8', timeout: 5000 });
        // Check if opencode is an npm global package
        execSync('npm list -g opencode', { encoding: 'utf8', timeout: 10000, stdio: 'pipe' });
        opencodeAvailable = true;
      } catch (e3) {
        return { passed: true, message: 'SKIPPED (opencode CLI not available)', time_ms: Date.now() - start };
      }
    }

    // Test 1: opencode --help works
    try {
      const helpOut = execSync('opencode --help', { encoding: 'utf8', timeout: 15000, stdio: 'pipe' });
      results.push({ name: 'opencode --help exits 0', pass: true });
    } catch (e) {
      results.push({ name: 'opencode --help exits 0', pass: false, detail: e.message });
    }

    // Test 2: Run brain agent with simple prompt (short timeout)
    try {
      const agentOut = execSync('opencode run --agent brain --prompt "say hello and nothing else" --max-steps 3', {
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe',
        cwd: config.BRAIN_AGENT_DIR,
      });
      results.push({ name: 'opencode run --agent brain exits 0', pass: true });
      const output = agentOut.toLowerCase();
      // Check for expected behavior (agent should respond)
      const hasResponse = output.length > 20;
      results.push({ name: 'Brain agent produces non-empty response', pass: hasResponse });
    } catch (e) {
      results.push({ name: 'opencode run --agent brain exits 0', pass: false, detail: e.message });
      // Still check if there's output
      if (e.stdout) {
        results.push({ name: 'Brain agent produces non-empty response', pass: e.stdout.length > 20 });
      } else {
        results.push({ name: 'Brain agent produces non-empty response', pass: false });
      }
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name + (r.detail ? ': ' + r.detail : ''));
    return {
      passed,
      message: passed
        ? 'All TC-06 runtime checks passed (opencode CLI active)'
        : 'Failed: ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
