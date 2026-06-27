import { scenario } from '@agentesting/agentest'

scenario('FULL: Complete L1-to-POST pipeline', {
  profile: 'Developer going through a full task lifecycle from request to review.',
  goal: 'Ask brain to analyze a code snippet, plan improvements, implement changes, and review the result.',
  conversationsPerScenario: 1, maxTurns: 6,
})
