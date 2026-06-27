import { scenario } from '@agentesting/agentest'

scenario('L3: Swarm pipeline code generation', {
  profile: 'Developer needing a complex code implementation.',
  goal: 'Ask brain to implement a REST API endpoint with validation, error handling, and tests.',
  conversationsPerScenario: 1, maxTurns: 6,
})
