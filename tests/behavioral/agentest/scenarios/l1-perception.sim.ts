import { scenario } from '@agentesting/agentest'

scenario('L1: 5-way parallel perception on greeting', {
  profile: 'Developer testing the brain agent for the first time.',
  goal: 'Send a greeting and get a response showing all 5 L1 perception indicators.',
  conversationsPerScenario: 2,
  maxTurns: 3,
})
