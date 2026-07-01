const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: no-args',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

const r1 = spawnSync('node', [INSTALL], { cwd: tmpDir, encoding: 'utf8' });
results.push({ name: 'no args exit 0', pass: r1.status === 0 });
results.push({ name: 'no args starts installing', pass: r1.stdout.includes('Installing') || r1.stdout.includes('installed') });
results.push({ name: 'no args shows success', pass: r1.stdout.includes('installed') || r1.stdout.includes('Brain Agent') });

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
