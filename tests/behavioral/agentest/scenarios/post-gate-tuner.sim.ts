import { scenario } from '@agentesting/agentest'

scenario('POST: Adaptive gate threshold tuning', {
  profile: 'User completing multiple consecutive tasks.',
  goal: 'Ask brain to evaluate recent task outcomes and adjust its decision thresholds.',
  conversationsPerScenario: 1, maxTurns: 5,
})
