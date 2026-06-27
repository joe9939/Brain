import { scenario } from '@agentesting/agentest'

scenario('CIRCUIT: Complete OODA loop across all phases', {
  profile: 'User asking a question that requires full brain processing.',
  goal: 'Ask brain about the current project status and see it go through all processing phases.',
  conversationsPerScenario: 1, maxTurns: 3,
})
