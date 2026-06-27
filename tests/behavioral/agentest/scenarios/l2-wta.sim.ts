import { scenario } from '@agentesting/agentest'

scenario('L2: Winner-take-most gate competition', {
  profile: 'User presenting a complex multi-faceted request.',
  goal: 'Ask brain about a topic that touches code, security, and architecture.',
  conversationsPerScenario: 1,
  maxTurns: 4,
})
