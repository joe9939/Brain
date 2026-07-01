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

    // Use real HOME (we know brain-agent is installed)
    const r1 = spawnSync('node', [INSTALL, '--status'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
    results.push({ name: 'status exit 0', pass: r1.status === 0 });
    results.push({ name: 'status shows ALL GOOD', pass: r1.stdout.includes('ALL GOOD') });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) { const r = module.exports.run(); console.log(r.passed?'PASS':'FAIL'); console.log(r.message); process.exit(r.passed?0:1); }
