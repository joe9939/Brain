import { scenario } from '@agentesting/agentest'

scenario('L1: Hippocampus retrieves relevant memories', {
  profile: 'User who has discussed this codebase before.',
  goal: 'Ask about a previous discussion topic and see if brain retrieves past context.',
  conversationsPerScenario: 1,
  maxTurns: 4,
})
