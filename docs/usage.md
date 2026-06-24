# Brain Agent — Usage Guide

## Activation
1. Install: `bunx brain-agent install`
2. Restart OpenCode
3. Press Tab → select [brain] (purple)
4. Start chatting — brain spawns 4 regions on every message

## Commands in brain mode
| Command | What it does |
|---------|-------------|
| `show brain` | Dashboard: MCP status, agent count, session time |
| `/brain` | Full dashboard |
| `/brain status` | Health check |
| `/brain memory` | Memory system stats |
| `/brain trace` | Recent activity trace |
| `/brain ablate amygdala` | Disable emotion detection |
| `/brain off` | Deactivate brain mode |

## What to expect
- Every message: 4 agents spawn in parallel (thalamus+amygdala+hippocampus+world-cortex)
- Fee records: 4 independent sessions visible
- Safety: rm -rf / and .env edits auto-blocked
- Delegation: brain cannot write code — must use swarm-coder

## Example
```
User: fix auth.ts timeout
Brain:
  [thalamus] gate=open priority=5
  [amygdala] mode=URGENT confidence=0.95
  [hippocampus] queries: login timeout, session expiry
  [world-cortex] callers: 5, risk: 7
  [PERCEIVE:✓][SYNTHESIZE:✓][DECIDE:✓][EXECUTE:✓][RECORD:✓]
  
  Spawning swarm-planner → DAG → coders → reviewer → tester...
```