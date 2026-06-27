import { scenario } from '@agentesting/agentest'

scenario('EDGE: Empty message handling', {
  profile: 'User accidentally sending an empty message.',
  goal: 'Send an empty message and see if brain handles it gracefully.',
  conversationsPerScenario: 1, maxTurns: 2,
})

scenario('EDGE: Very long message with special characters', {
  profile: 'User pasting a large code block.',
  goal: 'Paste a large code snippet and ask brain to analyze it.',
  conversationsPerScenario: 1, maxTurns: 3,
})
