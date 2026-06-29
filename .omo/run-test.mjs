import { spawn } from 'child_process'

const PORT = 4096

console.log('Starting opencode serve...')
const server = spawn('opencode', ['serve', '--port', String(PORT), '--hostname', '127.0.0.1'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
})

server.stderr.on('data', d => process.stderr.write(d.toString()))

// Wait for server to be ready
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server start timeout')), 15000)
  server.stdout.on('data', data => {
    if (data.toString().includes('listening')) {
      clearTimeout(timeout)
      resolve()
    }
  })
  server.on('error', reject)
})

console.log('Server ready! Creating session...')

const headers = { 'Content-Type': 'application/json' }
const baseUrl = `http://127.0.0.1:${PORT}`

// Create session
const createRes = await fetch(`${baseUrl}/session`, {
  method: 'POST',
  headers,
  body: JSON.stringify({})
})
const session = await createRes.json()
console.log('Session:', session.id)

// Send message
const msgRes = await fetch(`${baseUrl}/session/${session.id}/message`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model: { providerID: 'opencode-go', modelID: 'deepseek-v4-flash' },
    parts: [{ type: 'text', text: 'hi, reply in 5 words' }]
  })
})
const msg = await msgRes.json()
const reply = msg?.parts?.[0]?.text || msg?.info?.text || JSON.stringify(msg).slice(0, 300)
console.log('Reply:', reply)

server.kill()
process.exit(0)
