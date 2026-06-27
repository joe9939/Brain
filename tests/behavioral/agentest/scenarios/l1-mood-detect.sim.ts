import { scenario } from '@agentesting/agentest'

scenario('L1: Amygdala detects frustrated tone', {
  profile: 'Frustrated developer whose build has been broken for 3 days.',
  goal: 'Complain angrily about the broken build and verify brain detects urgency.',
  knowledge: [{ content: 'The CI pipeline has been failing for 3 days with no fix.' }],
  conversationsPerScenario: 1,
  maxTurns: 4,
})
