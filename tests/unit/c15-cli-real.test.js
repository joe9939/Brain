const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'C15: CLI (real)',
  run: () => {
    const R = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // 1. --help exits 0
    var rHelp = spawnSync('node', [INSTALL, '--help'], { cwd: tmpDir, encoding: 'utf8' });
    R.push({ n: '--help exit 0', p: rHelp.status === 0 });
    R.push({ n: '--help shows usage', p: /usage/i.test(rHelp.stdout) });
    R.push({ n: '--help shows --version', p: rHelp.stdout.includes('--version') });

    // 2. --version shows version
    var rVer = spawnSync('node', [INSTALL, '--version'], { cwd: tmpDir, encoding: 'utf8' });
    R.push({ n: '--version exit 0', p: rVer.status === 0 });
    R.push({ n: '--version has semver', p: /\d+\.\d+\.\d+/.test(rVer.stdout) });

    // 3. --dry-runs run and produce output
    var rDry = spawnSync('node', [INSTALL, '--dry-run'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
    R.push({ n: '--dry-run runs (exit 0 or 1)', p: rDry.status === 0 || rDry.status === 1 });
    R.push({ n: '--dry-run shows checks', p: rDry.stdout.includes('Plugin') || rDry.stdout.includes('✓') || rDry.stdout.includes('CHECKS') });

    // 4. --status in sandbox home (not installed) exits 1
    var fakeHome = path.join(tmpDir, 'home');
    fs.mkdirSync(path.join(fakeHome, '.config', 'opencode', 'plugins'), { recursive: true });
    var rStat = spawnSync('node', [INSTALL, '--status'], {
      cwd: tmpDir, encoding: 'utf8',
      env: Object.assign({}, process.env, { HOME: fakeHome, USERPROFILE: fakeHome }),
    });
    R.push({ n: '--status sandbox exit 1', p: rStat.status === 1 });

    // 5. --uninstall handles not-installed
    var rUn = spawnSync('node', [INSTALL, '--uninstall'], {
      cwd: tmpDir, encoding: 'utf8',
      env: Object.assign({}, process.env, { HOME: fakeHome, USERPROFILE: fakeHome }),
    });
    R.push({ n: '--uninstall not-installed exit 0', p: rUn.status === 0 });
    R.push({ n: '--uninstall shows message', p: rUn.stdout.length > 0 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: R.every(function(r) { return r.p; }), message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
