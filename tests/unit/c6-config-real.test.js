const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'C6: config (real)',
  run: async () => {
    const R = [];
    const cfgPath = path.join(os.homedir(), '.config', 'opencode', 'opencode.json');
    if (!fs.existsSync(cfgPath)) return { passed: true, message: 'SKIP config not found at ' + cfgPath + ' (CI or not installed)', time_ms: 0 };
    const raw = fs.readFileSync(cfgPath, 'utf8');
    let cfg;
    try { cfg = JSON.parse(raw); } catch (e) { return { passed: false, message: 'FAIL JSON parse error: ' + e.message, time_ms: 0 }; }

    R.push({ n: 'brain agent exists with mode:primary', p: cfg.agent?.brain?.mode === 'primary' });

    const agentKeys = Object.keys(cfg.agent || {});
    R.push({ n: 'agents count >= 20 (' + agentKeys.length + ')', p: agentKeys.length >= 20 });

    const allHavePermission = agentKeys.every(k => cfg.agent[k] && cfg.agent[k].permission);
    R.push({ n: 'all agents have permission fields', p: allHavePermission });

    R.push({ n: 'brain has task permission', p: cfg.agent?.brain?.permission?.task === 'allow' });
    R.push({ n: 'brain has skill permission', p: cfg.agent?.brain?.permission?.skill === 'allow' });
    R.push({ n: 'brain has todowrite permission', p: cfg.agent?.brain?.permission?.todowrite === 'allow' });

    const mcpKeys = Object.keys(cfg.mcp || {});
    R.push({ n: 'MCP entries count >= 1 (' + mcpKeys.length + ')', p: mcpKeys.length >= 1 });
    const allMcpLocal = mcpKeys.every(k => cfg.mcp[k] && cfg.mcp[k].type === 'local');
    R.push({ n: 'all MCP entries have type:local', p: allMcpLocal });
    const allMcpCmdArray = mcpKeys.every(k => cfg.mcp[k] && Array.isArray(cfg.mcp[k].command));
    R.push({ n: 'all MCP entries have command array', p: allMcpCmdArray });

    const pluginList = cfg.plugin || [];
    const hasBrainPlugin = pluginList.some(p => typeof p === 'string' && p.includes('brain-plugin'));
    R.push({ n: 'brain plugin in plugins', p: hasBrainPlugin });

    const ok = R.every(r => r.p);
    return { passed: ok, message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: 0 };
  },
};
