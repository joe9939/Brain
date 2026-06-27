import { scenario } from '@agentesting/agentest'

scenario('L1: World-cortex scans codebase', {
  profile: 'New developer onboarding to the project.',
  goal: 'Ask brain about the project structure and find key files.',
  conversationsPerScenario: 1,
  maxTurns: 4,
})
