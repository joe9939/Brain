# Contributing to Brain Agent

## Getting Started
1. Fork the repo
2. Clone: `git clone https://github.com/YOUR_USER/brain-agent.git`
3. Install deps: `cd src/mcp/* && npm install`

## Project Structure
See AGENTS.md for full layout.

## Adding a New Brain Region Agent
1. Create agent MD in `src/agents/your-agent.md`
2. Add to `config/opencode.example.json` agent section
3. Add trigger rule to `src/skills/brain-master.md`
4. Update README agent table

## Testing
```bash
# Test MCP servers
cd src/mcp/memory-store && npx tsc --noEmit
cd src/mcp/world-model && npx tsc --noEmit
cd src/mcp/reward-system && npx tsc --noEmit

# Test plugin
node --input-type=module -e "import('file:///$(pwd)/src/plugin/brain-plugin.mjs').then(m=>console.log(Object.keys(m)))"

# Test agents
opencode agent list  # Should show 20 agents
```

## Paper Alignment
All changes should reference arXiv 2504.01990 sections.
See docs/architecture-v7-final.md for current alignment.