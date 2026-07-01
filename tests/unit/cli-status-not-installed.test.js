const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: status-not-installed',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // Empty config dir → not installed
    const emptyDir = path.join(tmpDir, '.config', 'opencode', 'plugins');
    fs.mkdirSync(emptyDir, { recursive: true });

    const r1 = spawnSync('node', [INSTALL, '--status'], {
      cwd: tmpDir, encoding: 'utf8',
      env: { ...process.env, HOME: tmpDir },
    });
    results.push({ name: 'not-installed exit 1', pass: r1.status === 1 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) {
  const start = Date.now();
  const result = module.exports.run();
  console.log(result.passed ? 'PASS' : 'FAIL');
  console.log(result.message);
  process.exit(result.passed ? 0 : 1);
}
