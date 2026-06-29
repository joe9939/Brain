# Brain Hook Architecture - Code-Level Circuit Enforcement

## Goal
Replace pure-prompt circuit reliance with code-level hook enforcement.

## Architecture

brain-plugin.mjs (G1-G7) + brain-hooks.js (NEW)

### T1: tool.execute.before
| Circuit | Action |
|---------|--------|
| Safety | Block dangerous bash commands |
| Attention Budget | Track task() call count |
| Causal Analysis | Inject world_causal_analyze reminder |
| Global State | Attach GLOBAL_STATE to context |

### T2: tool.execute.after
| Circuit | Action |
|---------|--------|
| L1 Perception | Track 5 L1 agents, log when all fire |
| Mood Modulation | Detect amygdala output, update mood state |
| Reward-Attention | Verify reward_bias formula applied |
| Emotional Contagion | Collect mood from swarm sub-agents |
| World Predict | Check world_diff called after coder |
| Versioned State | Increment counter on GLOBAL_STATE writes |
| Learning Loop | Check recent_lessons stored |
| Gate Tuner | Trigger after 3+ gate decisions |
| Memory Decay | Call memory_decay after task |
| Memory Conflict | Call memory_detect_conflicts |

### T3: chat.message
| Circuit | Action |
|---------|--------|
| Mood-All | Inject current mood into context |
| Personality | Inject OCEAN traits |

### T4: event
| Circuit | Action |
|---------|--------|
| OODA Loop | Check cycle_count on idle |
| Homeostasis | Trigger on session.error |
| Consolidation | Call memory_consolidate on idle>30min |

## Logging
All circuit activity logged to brain-circuit.log for debugging.
