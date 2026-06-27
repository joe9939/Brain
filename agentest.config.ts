// agentest.config.ts — Agentest configuration for Brain Agent E2E testing
//
// Run: AGENTEST_ALLOW_PRIVATE_ENDPOINTS=1 npx agentest run
//
// Architecture:
//   Agentest Simulated User (LLM) ──→ generates test messages
//         ↓
//   Custom Handler ──→ @opencode-ai/sdk ──→ localhost:4096 ──→ Brain Agent
//         ↓
//   Agentest Eval Judges (LLM) ──→ evaluates response quality
//
// Both the simulated user and judges use the OpenCode Go API key.

import { defineConfig } from '@agentesting/agentest'
import { createOpencodeClient } from '@opencode-ai/sdk'

const OPENCODE_GO_API_KEY = 'sk-NRkyzN3BqxX15hKXS11kkxqu2WlliP9FTbkPeDuoHoQeAXnQOGKPwlz1oWc49UwY'

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
  // Brain agent handler — routes through local OpenCode desktop API
  agent: {
    type: 'custom',
    name: 'brain',
    handler: async (messages) => {
      const session = await getBrainSession()
      const lastMsg = messages[messages.length - 1]
      const text = typeof lastMsg?.content === 'string' ? lastMsg.content : ''
      const result = await client.session.prompt({
        path: { id: session.id },
        body: { agent: 'brain', parts: [{ type: 'text', text }] },
      })
      const msg = result.data
      const content = msg?.parts?.[0]?.text || JSON.stringify(msg)
      return { role: 'assistant' as const, content }
    },
  },

  // LLM for simulated user + evaluation judges
  // Uses your OpenCode Go subscription (deepseek-v4-flash)
  provider: 'openai-compatible',
  model: 'minimax-m3',
  providerOptions: {
    baseURL: 'https://opencode.ai/zen/go/v1',
    apiKey: OPENCODE_GO_API_KEY,
  },

  // Simulation params
  conversationsPerScenario: 2,
  maxTurns: 5,
  concurrency: 3,

  // Eval metrics — run all
  metrics: ['goal_completion', 'agent_behavior_failure'],
  thresholds: {
    goal_completion: 0.5,
  },

  reporters: ['console', 'json'],
  unmockedTools: 'passthrough',

  include: ['tests/behavioral/agentest/scenarios/**/*.sim.ts'],
})
