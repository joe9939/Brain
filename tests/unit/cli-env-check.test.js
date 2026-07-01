const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL = path.join(__dirname, '../../install.js');

module.exports = {
  name: 'CLI: env-check',
  run: () => {
    const results = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // Normal env — should install or show help
    const r1 = spawnSync('node', [INSTALL, '--help'], { cwd: tmpDir, encoding: 'utf8' });
    results.push({ name: 'help in normal env', pass: r1.status === 0 });
    results.push({ name: 'help shows version', pass: /\d+\.\d+\.\d+/.test(r1.stdout) });

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { passed: results.every(r => r.pass), message: results.map(r => `${r.pass?'✓':'✗'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};

if (require.main === module) { const r = module.exports.run(); console.log(r.passed?'PASS':'FAIL'); console.log(r.message); process.exit(r.passed?0:1); }
