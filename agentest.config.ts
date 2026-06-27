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
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Auto-load .env file (no dotenv dependency needed)
const envPath = join(import.meta.dir, '..', '..', '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

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
  // Uses your OpenCode Go subscription
  provider: 'openai-compatible',
  model: 'deepseek-v4-flash',
  providerOptions: {
    baseURL: 'https://opencode.ai/zen/go/v1',
    apiKey: process.env.OPENCODE_GO_API_KEY || '',
    extraBody: { _strip_response_format: true },  // triggers customFetch, strips response_format
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
