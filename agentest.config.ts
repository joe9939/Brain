// agentest.config.ts — Agentest configuration for Brain Agent E2E testing
//
// Prerequisites:
//  1. OpenCode desktop must be running (HTTP API on localhost:4096)
//  2. Brain agent must be installed and configured
//  3. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for the simulated user
//
// Run: AGENTEST_ALLOW_PRIVATE_ENDPOINTS=1 npx agentest run

import { defineConfig } from '@agentesting/agentest'
import { createOpencodeClient } from '@opencode-ai/sdk'

const client = createOpencodeClient({ baseUrl: 'http://localhost:4096' })
let brainSession: any = null

async function getBrainSession() {
  if (brainSession) return brainSession
  const sessions = await client.session.list()
  brainSession = sessions.data?.find((s: any) => s.title === 'agentest-brain')
  if (!brainSession) {
    const created = await client.session.create({ body: { title: 'agentest-brain', agent: 'brain' } })
    brainSession = created.data
  }
  return brainSession
}

export default defineConfig({
  agent: {
    type: 'custom',
    name: 'brain',
    handler: async (messages) => {
      const session = await getBrainSession()
      const lastMsg = messages[messages.length - 1]
      const text = typeof lastMsg?.content === 'string' ? lastMsg.content : ''

      const result = await client.session.prompt({
        path: { id: session.id },
        body: {
          agent: 'brain',
          parts: [{ type: 'text', text }],
        },
      })

      const msg = result.data
      const content = msg?.parts?.[0]?.text || JSON.stringify(msg)
      return { role: 'assistant' as const, content }
    },
  },

  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  conversationsPerScenario: 1,
  maxTurns: 4,
  concurrency: 3,
  metrics: ['goal_completion', 'agent_behavior_failure'],
  include: ['tests/**/*.sim.ts'],
  reporters: ['console', 'json'],
  unmockedTools: 'passthrough',
})
