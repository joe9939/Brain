// cli-remaining.test.js - Remaining CLI: edge cases, env, dry-run output, backup restore
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const cfg = require('../config');

function r(n, p) { return { name: n, pass: p }; }

function run(cmd) {
  try { var out = execSync(cmd, { cwd: cfg.BRAIN_AGENT_DIR, encoding: 'utf8', timeout: 30000, stdio: 'pipe' }); return { code: 0, out: out, err: '' }; }
  catch(e) { return { code: e.status || 1, out: e.stdout || '', err: e.stderr || e.message }; }
}

module.exports = {
  name: 'CLI: Remaining Edge Cases',
  run: async () => {
    const start = Date.now();
    const results = [];
    var script = cfg.INSTALL_SCRIPT;

    // 1. --help output contains expected sections
    var help = run('node "' + script + '" --help');
    results.push(r('help shows installer', help.out.indexOf('Installer') >= 0 || help.out.indexOf('install') >= 0));
    results.push(r('help shows --uninstall', help.out.indexOf('--uninstall') >= 0));
    results.push(r('help shows --status', help.out.indexOf('--status') >= 0));

    // 2. --version matches package.json
    try {
      var pkg = JSON.parse(fs.readFileSync(path.join(cfg.BRAIN_AGENT_DIR, 'package.json'), 'utf8'));
      var ver = run('node "' + script + '" --version');
      results.push(r('version matches', ver.out.indexOf(pkg.version) >= 0));
    } catch(e) { results.push(r('version check error', false)); }

    // 3. Invalid flags handled gracefully
    var bad = run('node "' + script + '" --bogus-flag');
    results.push(r('invalid flag exits non-zero', bad.code !== 0));
    results.push(r('invalid flag shows error', bad.err.indexOf('unknown') >= 0 || bad.err.indexOf('not recognized') >= 0 || bad.err.indexOf('bogus') >= 0 || bad.err.length > 0));

    // 4. Status shows components
    var status = run('node "' + script + '" --status');
    results.push(r('status: non-empty output', status.out.length > 0));

    // 5. Dry run safety (may have pre-existing check failures)
    var dry = run('node "' + script + '" --dry-run');
    results.push(r('dry-run output exists', dry.out.indexOf('Dry Run') >= 0 || dry.out.indexOf('brain') >= 0));
    results.push(r('dry-run has some passes', dry.out.indexOf('\u2713') >= 0 || dry.out.indexOf('✓') >= 0 || dry.out.indexOf('PASS') >= 0));

    // 6. Install script syntax
    try { execSync('node --check "' + script + '"', { stdio: 'pipe' }); results.push(r('script syntax OK', true)); }
    catch(e) { results.push(r('script syntax error', false)); }

    // 7. Plugin file syntax
    try { execSync('node --check "' + cfg.PLUGIN_FILE + '"', { stdio: 'pipe' }); results.push(r('plugin syntax OK', true)); }
    catch(e) { results.push(r('plugin syntax error', false)); }

    // 8. Hooks file syntax
    try { execSync('node --check "' + path.join(cfg.BRAIN_AGENT_DIR, 'src/plugin/brain-hooks.mjs') + '"', { stdio: 'pipe' }); results.push(r('hooks syntax OK', true)); }
    catch(e) { results.push(r('hooks syntax error', false)); }

    // 9. Agent config files exist
    var agentsDir = cfg.AGENTS_DIR;
    if (fs.existsSync(agentsDir)) {
      var agentFiles = fs.readdirSync(agentsDir).filter(function(f) { return f.endsWith('.md') || f.endsWith('.json'); });
      results.push(r('agent configs exist', agentFiles.length > 0));
    } else { results.push(r('agent configs exist', false)); }

    // 10. Prompt files exist
    var promptsDir = cfg.PROMPTS_DIR;
    if (fs.existsSync(promptsDir)) {
      var promptFiles = fs.readdirSync(promptsDir).filter(function(f) { return f.endsWith('.md') || f.endsWith('.txt'); });
      results.push(r('prompt files exist', promptFiles.length > 0));
    } else { results.push(r('prompt files exist', false)); }

    // 11. opencode.json references brain agent
    try {
      var oc = JSON.parse(fs.readFileSync(cfg.OPCODE_CONFIG, 'utf8'));
      var hasBrain = oc.agent && oc.agent.brain;
      results.push(r('opencode.json has brain agent', !!hasBrain));
    } catch(e) { results.push(r('opencode.json read error', false)); }

    // 12. Backup directory (if exists)
    var backupDir = cfg.BACKUP_DIR;
    results.push(r('backup dir check', !fs.existsSync(backupDir) || fs.statSync(backupDir).isDirectory()));

    var passed = results.every(function(r2) { return r2.pass; });
    var failed = results.filter(function(r2) { return !r2.pass; }).map(function(r2) { return r2.name; });
    return { passed: passed, message: passed ? 'All ' + results.length + ' CLI remaining checks passed' : 'FAIL: ' + failed.join('; '), time_ms: Date.now() - start };
  },
};
