import { scenario } from '@agentesting/agentest'

scenario('MCP: Memory-store stores and retrieves information', {
  profile: 'User testing the brain memory system.',
  goal: 'Ask brain to remember a fact and then confirm it was stored.',
  conversationsPerScenario: 1, maxTurns: 5,
})
