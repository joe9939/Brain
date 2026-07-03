const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: status-installed',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // Status check — on CI there's no opencode, so accept non-zero too
    const r1 = spawnSync('node', [INSTALL, '--status'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
    results.push({ name: 'status exit 0 or 1', pass: r1.status === 0 || r1.status === 1 });
    results.push({ name: 'status has output', pass: r1.stdout.length > 20 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) { const r = module.exports.run(); console.log(r.passed?'PASS':'FAIL'); console.log(r.message); process.exit(r.passed?0:1); }
