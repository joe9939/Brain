// test-mcp.js — quick MCP server health check
const { spawn } = require('child_process');
const path = require('path');

const servers = [
  { name: 'memory-store', file: 'src/mcp/memory-store/dist/server.js' },
  { name: 'world-model', file: 'src/mcp/world-model/dist/server.js' },
  { name: 'reward-system', file: 'src/mcp/reward-system/dist/server.js' },
];

async function testServer(name, file) {
  const serverPath = path.join(__dirname, file);
  if (!require('fs').existsSync(serverPath)) {
    console.log(`  ✗ ${name}: dist/ not found — run build first`);
    return false;
  }
  return true;
}

(async () => {
  console.log('\nMCP Server Check:');
  let ok = 0;
  for (const s of servers) {
    const result = await testServer(s.name, s.file);
    if (result) { console.log(`  ✓ ${s.name}`); ok++; }
  }
  console.log(`\n${ok}/${servers.length} servers ready\n`);
  process.exit(ok === servers.length ? 0 : 1);
})();