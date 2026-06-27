import { scenario } from '@agentesting/agentest'

scenario('L3: World model predict and causal analysis', {
  profile: 'Developer planning a risky refactoring.',
  goal: 'Ask brain to predict the impact of renaming a core function used across the codebase.',
  conversationsPerScenario: 1, maxTurns: 5,
})
