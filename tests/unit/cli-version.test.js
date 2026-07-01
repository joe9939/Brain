const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: version',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    const r1 = spawnSync('node', [INSTALL, '--version'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: '--version exit 0', pass: r1.status === 0 });
    results.push({ name: '--version has number', pass: /\d+\.\d+\.\d+/.test(r1.stdout) });

    const r2 = spawnSync('node', [INSTALL, '-v'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: '-v exit 0', pass: r2.status === 0 });
    results.push({ name: '-v same version', pass: r2.stdout.trim() === r1.stdout.trim() });

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
