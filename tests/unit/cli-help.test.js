const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: help',
  run: () => {
    const results = [];

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // 1. --help flag
    const r1 = spawnSync('node', [INSTALL, '--help'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: 'exit code 0', pass: r1.status === 0 });
    results.push({ name: 'contains usage', pass: r1.stdout.toLowerCase().includes('usage') });
    results.push({ name: 'contains --help', pass: r1.stdout.includes('--help') });
    results.push({ name: 'contains --status', pass: r1.stdout.includes('--status') });
    results.push({ name: 'contains --version', pass: r1.stdout.includes('--version') });

    // 2. -h shorthand flag
    const r2 = spawnSync('node', [INSTALL, '-h'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: '-h exit code 0', pass: r2.status === 0 });
    results.push({ name: '-h contains usage', pass: r2.stdout.toLowerCase().includes('usage') });
    results.push({ name: '-h contains --help', pass: r2.stdout.includes('--help') });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

// Allow direct execution: node tests/unit/cli-help.test.js
if (require.main === module) {
  const test = module.exports;
  const start = Date.now();
  const result = test.run();
  const elapsed = Date.now() - start;
  console.log(result.passed ? 'PASS' : 'FAIL');
  console.log(result.message);
  process.exit(result.passed ? 0 : 1);
}
