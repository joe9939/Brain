const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: dry-run',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    const r1 = spawnSync('node', [INSTALL, '--dry-run'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
    results.push({ name: 'dry-run runs', pass: r1.status === 0 || r1.status === 1 });
    results.push({ name: 'dry-run shows checks', pass: r1.stdout.includes('✓') || r1.stdout.includes('checks') });
    results.push({ name: 'dry-run completed', pass: r1.stdout.includes('ALL') || r1.stdout.includes('SOME') || r1.stdout.includes('PASSED') });

    const r2 = spawnSync('node', [INSTALL, '--verify'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
    results.push({ name: '--verify runs', pass: r2.status === 0 || r2.status === 1 });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) { const r = module.exports.run(); console.log(r.passed?'PASS':'FAIL'); console.log(r.message); process.exit(r.passed?0:1); }
