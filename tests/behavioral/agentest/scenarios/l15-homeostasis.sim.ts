import { scenario } from '@agentesting/agentest'

scenario('L1.5: Homeostasis corrective action', {
  profile: 'User sending multiple rapid messages in succession.',
  goal: 'Send 3 rapid messages and observe brain maintains stable operation.',
  conversationsPerScenario: 1,
  maxTurns: 5,
})
