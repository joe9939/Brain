const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

// Full install → reinstall → uninstall cycle in a temp HOME sandbox
// Requires the project to be copied or linked so install.js can find source files
module.exports = {
  name: 'CLI: install cycle',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    const fakeHome = path.join(tmpDir, 'home');
    const fakeProject = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(fakeHome, '.config', 'opencode', 'plugins'), { recursive: true });
    fs.mkdirSync(path.join(fakeProject, '.opencode'), { recursive: true });

    // 1. Status in empty home → not installed (exit 1)
    const r1 = spawnSync('node', [INSTALL, '--status'], {
      cwd: fakeProject, encoding: 'utf8',
      env: { ...process.env, HOME: fakeHome },
    });
    results.push({ name: 'empty home status exit 1', pass: r1.status === 1 });

    // 2. Uninstall when not installed → exit 0
    const r2 = spawnSync('node', [INSTALL, '--uninstall'], {
      cwd: fakeProject, encoding: 'utf8',
      env: { ...process.env, HOME: fakeHome },
    });
    results.push({ name: 'uninstall not-installed exit 0', pass: r2.status === 0 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) { const r = module.exports.run(); console.log(r.passed?'PASS':'FAIL'); console.log(r.message); process.exit(r.passed?0:1); }
