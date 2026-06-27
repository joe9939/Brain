import { scenario } from '@agentesting/agentest'

scenario('CIRCUIT: Mood propagation through all layers', {
  profile: 'User expressing strong urgency about a production issue.',
  goal: 'Report a critical production bug with extreme urgency.',
  knowledge: [{ content: 'The production server is currently down and users are affected.' }],
  conversationsPerScenario: 1, maxTurns: 4,
})
