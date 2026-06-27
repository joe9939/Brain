import { scenario } from '@agentesting/agentest'

scenario('MCP: Reward-system evaluates task outcome', {
  profile: 'User asking brain to self-evaluate its own performance.',
  goal: 'Ask brain to rate how well it handled a previous request.',
  conversationsPerScenario: 1, maxTurns: 4,
})
