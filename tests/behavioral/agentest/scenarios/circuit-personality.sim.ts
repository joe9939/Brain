import { scenario } from '@agentesting/agentest'

scenario('CIRCUIT: Personality trait influence on responses', {
  profile: 'User asking for opinions on code architecture trade-offs.',
  goal: 'Ask brain to compare two different architectural approaches and explain preferences.',
  conversationsPerScenario: 1, maxTurns: 4,
})
