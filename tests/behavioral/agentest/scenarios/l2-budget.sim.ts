import { scenario } from '@agentesting/agentest'

scenario('L2: Attention budget enforcement', {
  profile: 'User bombarding brain with many simultaneous requests.',
  goal: 'Ask many questions at once and see if brain manages its attention budget.',
  conversationsPerScenario: 1,
  maxTurns: 3,
})
