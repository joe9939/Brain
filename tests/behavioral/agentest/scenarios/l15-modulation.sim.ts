import { scenario } from '@agentesting/agentest'

scenario('L1.5: Mood decay and reward modulation', {
  profile: 'User asking brain to evaluate a risky code change.',
  goal: 'Ask brain about the risks of a database migration and see modulated response.',
  conversationsPerScenario: 1,
  maxTurns: 4,
})
