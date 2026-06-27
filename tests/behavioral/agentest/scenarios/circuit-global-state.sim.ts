import { scenario } from '@agentesting/agentest'

scenario('CIRCUIT: Shared global state across layers', {
  profile: 'User asking about overall system session state.',
  goal: 'Ask brain how it is feeling and what it remembers about the current project.',
  conversationsPerScenario: 1, maxTurns: 4,
})
