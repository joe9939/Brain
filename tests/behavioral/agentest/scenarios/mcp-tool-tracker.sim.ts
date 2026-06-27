import { scenario } from '@agentesting/agentest'

scenario('MCP: Tool-tracker monitors agent reputation', {
  profile: 'User curious about which tools and agents are most effective.',
  goal: 'Ask brain about which tools it uses most frequently.',
  conversationsPerScenario: 1, maxTurns: 3,
})
