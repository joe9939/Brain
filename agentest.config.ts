// agentest.config.ts — Agentest configuration for Brain Agent E2E testing
//
// Run: npx agentest run
//
// Architecture:
//   Agentest Simulated User (LLM) ──→ generates test messages via OpenCode Go API
//         ↓
//   Custom Handler ──→ OpenCode HTTP API (port from env or 49536) ──→ Brain Agent
//         ↓
//   Agentest Eval Judges (LLM) ──→ evaluates response quality
//
// LLM provider: uses your OpenCode Go subscription (set OPENCODE_GO_API_KEY in .env)
// Brain agent: connects to OpenCode desktop API (set OPENCODE_PORT, OPENCODE_SERVER_PASSWORD in .env)

import { defineConfig } from '@agentesting/agentest'
import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

// Auto-load .env file
const envPath = process.cwd() + '/.env'
let opencodePassword = ''
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

export default defineConfig({
  // Brain agent via OpenCode Server HTTP API (opencode serve must be running)
  agent: {
    type: 'custom',
    name: 'brain',
    handler: async (messages) => {
      const lastMsg = messages[messages.length - 1]
      const text = typeof lastMsg?.content === 'string' ? lastMsg.content : ''
      const port = process.env.AGENTEST_SERVER_PORT || '14100'
      const base = `http://127.0.0.1:${port}`
      // 1. Create a new session
      const createRes = await fetch(`${base}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'build', title: 'agentest-test' }),
      })
      const session = await createRes.json() as any
      const sessionID = session?.id
      if (!sessionID) throw new Error('Failed to create session: ' + JSON.stringify(session))
      // 2. Send message and wait for response
      const msgRes = await fetch(`${base}/session/${sessionID}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: [{ type: 'text', text }] }),
      })
      const msg = await msgRes.json() as any
      const content = msg?.parts?.map(p => p.text).filter(Boolean).join('\n') || JSON.stringify(msg)
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
