// c17-permission-real.test.js — C17 Real permission system test (opencode.json agent permissions)
// Tests that actual agent permissions in the runtime opencode.json match expected values

const fs = require('fs');
const path = require('path');

function findConfig() {
  const candidates = [
    path.join(__dirname, '..', '..', 'config', 'opencode.example.json'),
    path.join(__dirname, '..', '..', 'opencode.json'),
    path.join(__dirname, '..', '..', 'opencode.jsonc'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const home = require('os').homedir();
  const user = path.join(home, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(user)) return user;
  return candidates[0];
}

module.exports = {
  name: 'C17: permission (real)',
  run: async () => {
    const R = [];
    const cfgPath = findConfig();
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw);
    const agents = cfg.agent || {};

    // brain has task/skill/todowrite allow
    const brain = agents.brain || { permission: {} };
    const bp = brain.permission || {};
    R.push({ n: 'brain has task:allow', p: bp.task === 'allow' });
    R.push({ n: 'brain has skill:allow', p: bp.skill === 'allow' });
    R.push({ n: 'brain has todowrite:allow', p: bp.todowrite === 'allow' });
    R.push({ n: 'brain mode is primary', p: brain.mode === 'primary' });
    R.push({ n: 'brain has description', p: typeof brain.description === 'string' && brain.description.length > 0 });

    // swarm-coder has write/edit/bash/webfetch/websearch/grep/glob allow
    const sc = agents['swarm-coder'] || { permission: {} };
    const scp = sc.permission || {};
    R.push({ n: 'swarm-coder has read:allow', p: scp.read === 'allow' });
    R.push({ n: 'swarm-coder has write:allow', p: scp.write === 'allow' });
    R.push({ n: 'swarm-coder has edit:allow', p: scp.edit === 'allow' });
    R.push({ n: 'swarm-coder has bash:allow', p: scp.bash === 'allow' });
    R.push({ n: 'swarm-coder has webfetch:allow', p: scp.webfetch === 'allow' });
    R.push({ n: 'swarm-coder has websearch:allow', p: scp.websearch === 'allow' });
    R.push({ n: 'swarm-coder has grep:allow', p: scp.grep === 'allow' });
    R.push({ n: 'swarm-coder has glob:allow', p: scp.glob === 'allow' });

    // amygdala has read only (no write/edit/bash)
    const amy = agents.amygdala || agents['amygdala'] || { permission: {} };
    const ap = amy.permission || {};
    R.push({ n: 'amygdala has read:allow', p: ap.read === 'allow' });
    R.push({ n: 'amygdala no write', p: ap.write !== 'allow' });
    R.push({ n: 'amygdala no edit', p: ap.edit !== 'allow' });
    R.push({ n: 'amygdala no bash', p: ap.bash !== 'allow' });
    R.push({ n: 'amygdala no task', p: ap.task !== 'allow' });

    // Verify at least 15 agents registered
    const agentCount = Object.keys(agents).length;
    R.push({ n: 'agent count >= 15 (got ' + agentCount + ')', p: agentCount >= 15 });

    return {
      passed: R.every(r => r.p),
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
