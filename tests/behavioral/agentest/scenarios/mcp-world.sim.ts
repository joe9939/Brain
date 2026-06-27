import { scenario } from '@agentesting/agentest'

scenario('MCP: World-model queries codebase', {
  profile: 'Developer onboarding to a new codebase.',
  goal: 'Ask brain about project structure and find where authentication logic lives.',
  conversationsPerScenario: 1, maxTurns: 4,
})
