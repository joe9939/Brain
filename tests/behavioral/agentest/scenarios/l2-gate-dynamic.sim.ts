import { scenario } from '@agentesting/agentest'

scenario('L2: Dynamic gate threshold adjustment', {
  profile: 'Developer with multiple pending tasks.',
  goal: 'List several tasks and ask brain to prioritize them.',
  conversationsPerScenario: 1,
  maxTurns: 5,
})
