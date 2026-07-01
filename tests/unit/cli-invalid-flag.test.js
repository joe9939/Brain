const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: invalid-flag',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    const r1 = spawnSync('node', [INSTALL, '--invalid-flag'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: 'invalid flag exit non-zero', pass: r1.status !== 0 });
    results.push({ name: 'invalid flag shows error', pass: /error|unknown|invalid/i.test(r1.stderr + r1.stdout) });

    const r2 = spawnSync('node', [INSTALL, '--bogus'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: 'bogus flag exit non-zero', pass: r2.status !== 0 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) {
  const test = module.exports;
  const start = Date.now();
  const result = test.run();
  const elapsed = Date.now() - start;
  console.log(result.passed ? 'PASS' : 'FAIL');
  console.log(result.message);
  process.exit(result.passed ? 0 : 1);
}
