# Brain Agent — Project Structure

## Overview
Brain-inspired Foundation Agent for OpenCode. Implements arXiv 2504.01990.
20 brain-region sub-agents, 3 MCP servers, 1 OpenCode plugin.

## Directory Layout
```
src/
├── plugin/          OpenCode plugin (L1 safety + logging)
├── skills/          System prompt (brain-master.md)
├── agents/          20 brain-region agent definitions
├── commands/        /brain slash command
├── mcp/             MCP servers (memory-store, world-model, reward-system)
└── install/         Install scripts

config/              Example configuration
docs/                Architecture + paper alignment docs
```

## Key Files
- `src/plugin/brain-plugin.mjs` — tool.execute.before hook for L1 safety
- `src/skills/brain-master.md` — brain agent system prompt (1657 chars)
- `config/opencode.example.json` — full config template
- `docs/architecture-v7-final.md` — definitive architecture

## Agent Categories
- Always-on (4): thalamus, amygdala, hippocampus, world-cortex
- Conditional (6): attention, reward, safety, basal-ganglia, cerebellum, self-enhance
- Complex task (4): swarm-planner, swarm-coder, swarm-reviewer, swarm-tester
- Meta/Background (6): insula, hypothalamus, dmn, self-optimizer, offline-consolidation, brain

## Commands
- `bunx brain-agent install` — interactive setup
- `/brain` — dashboard
- `/brain status` — health check
- `/brain memory` — memory stats
- `/brain trace` — trace log
- `/brain ablate <region>` — disable region
- `/brain off` — deactivate