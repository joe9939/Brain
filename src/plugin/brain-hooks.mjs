// brain-hooks.mjs — Foundation Agents Loop (arXiv 2504.01990 §1.3A)
// Brain-like parallel processing: all modules always active, strongest signal wins
// Hook tiers: T1=inject, T2=detect, T3=perceive, T4=maintain
// M_t = {M^mem, M^wm, M^emo, M^goal, M^rew}
//
// Core principle (paper §1.3A + neuroscience):
//   The brain doesn't sequence — it competes. Multiple modules are always active.
//   The module with the strongest signal at any moment drives the next action.
//   "Phase" is an emergent property, not a scheduled step.

import { appendFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG = join(homedir(), '.config/opencode', 'brain-circuit.log')
const L1_AGENTS = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety']

function log(m) { try { appendFileSync(LOG, JSON.stringify({ts:Date.now(),msg:m})+'\n') } catch {} }

// ─── Mental State M_t — always-on shared state ───
const S = new Map()
function getS(id) {
  if (!S.has(id)) S.set(id, {
    M_mem:  { working: [], episodic: 0, consolidation: 0 },
    M_wm:   { last_scan: 0, changed_files: [] },
    M_emo:  { mode:'NORMAL', intensity:0.1, valence:0.1, arousal:0.3, dominance:0.5 },
    M_goal: { active: [], completed: 0 },
    M_rew:  { score: 0, total: 0, history: [] },
    // Learning signal
    td_error: 0,
    // Loop counters
    cycle: 0, lastEvent: 0, swarm: false,
    // L1 completion tracking
    l1: new Set(),
    // Working memory — L1 outputs stored by agent name
    wm: {},
    // Already-injected signal (dedup)
    _last_signal: null,
  })
  return S.get(id)
}

// ─── Signal computation — all modules always compute their strength ───
// Returns the strongest signal + instruction. Called on every T1 before tool execution.

const SIGNALS = {
  perceive: {
    label: 'L1 Perception',
    priority: 5,  // highest — new input must be processed first
    strength: (s) => s.l1.size < 5 ? 1.0 - s.l1.size * 0.15 : 0,
    instruction: () => `[Brain: L1 — Parallel Perception]
Execute ALL 5 L1 agents in parallel:
1. task(category="brain-thalamus") → gate, urgency, intent
2. task(category="brain-amygdala") → detect mood (NORMAL/URGENT/CAUTION/EXPLORE/SUPPORT)
3. task(category="brain-hippocampus") → retrieve relevant memories
4. task(category="brain-world-cortex") → codebase context + impact
5. task(category="brain-safety") → background security scan
Collect all 5 via background_output().`
  },
  emotion: {
    label: 'Emotion Propagation',
    priority: 4,
    strength: (s) => {
      const m = s.M_emo
      return (m.mode === 'CAUTION' || m.mode === 'URGENT') ? 0.9 : m.intensity * 0.5
    },
    instruction: (s) => {
      const m = s.M_emo
      const moodNote = m.mode === 'CAUTION' ? '⚠️ CAUTION — safety gates heightened' :
                       m.mode === 'URGENT' ? '⚡ URGENT — fast response, reward×1.3' :
                       m.mode === 'EXPLORE' ? '🔍 EXPLORE — curiosity boosted' : ''
      return `[Brain: Emotion — ${m.mode}@${m.intensity.toFixed(1)} v=${m.valence.toFixed(1)} a=${m.arousal.toFixed(1)}]
${moodNote}
→ safety_threshold=${m.mode === 'CAUTION' ? 'strict' : m.mode === 'URGENT' ? 'heightened' : 'normal'}
→ reward_multiplier=${m.mode === 'URGENT' ? 0.9 : m.mode === 'SUPPORT' ? 0.8 : 0.7}
→ memory_importance=${(Math.abs(m.valence)*m.arousal).toFixed(2)}
Propagate to all downstream layers.`
    }
  },
  memory: {
    label: 'Memory Retrieval',
    priority: 3,
    strength: (s) => {
      const wm = s.wm
      const h = wm['hippocampus']
      const sopCount = (h?.relevant_sops || []).length
      const epCount = (h?.episodic || []).length
      return sopCount > 0 ? 0.8 : epCount > 0 ? 0.5 : 0
    },
    instruction: (s) => {
      const h = s.wm['hippocampus'] || {}
      const sopCount = (h.relevant_sops || []).length
      const epCount = (h.episodic || []).length
      return `[Brain: Memory — ${epCount} episodic, ${sopCount} SOPs matched]
Relevant past experiences found — use for context.${sopCount > 0 ? '\n→ Fire basal-ganglia for Go/NoGo decision based on SOPs.' : ''}`
    }
  },
  reward: {
    label: 'Reward Evaluation',
    priority: 3,
    strength: (s) => s.M_rew.score < 3 ? 0.8 : Math.abs(s.td_error) > 1 ? 0.6 : 0,
    instruction: (s) => {
      const r = s.M_rew
      return `[Brain: Reward — score=${r.score.toFixed(1)} td_error=${s.td_error.toFixed(2)}]
${r.score < 3 ? '⚠️ Low score — activate deep Reasoning(R) via reward-cortex' : ''}
${Math.abs(s.td_error) > 1 ? `📉 Prediction off by ${Math.abs(s.td_error).toFixed(1)} — update world model` : ''}`
    }
  },
  action: {
    label: 'Action Execution',
    priority: 2,
    strength: (s) => s.swarm ? 0.8 : 0,
    instruction: () => `[Brain: Action — Complex task detected]
Decompose via swarm-planner → coder → reviewer → tester. Track rewards per step.`
  },
  learning: {
    label: 'POST — Learning',
    priority: 1,
    strength: (s) => s.M_goal.completed > 0 && s.l1.size === 5 ? 0.7 : 0,
    instruction: (s) => {
      let periodic = ''
      if (s.M_goal.completed > 0 && s.M_goal.completed % 3 === 0) periodic += '\n→ self-optimizer review (every-3)'
      if (s.M_goal.completed > 0 && s.M_goal.completed % 5 === 0) periodic += '\n→ curiosity + meta-learner (every-5)'
      return `[Brain: POST — Learning + Consolidation]
td_error=${s.td_error.toFixed(2)} | goals=${s.M_goal.completed}
1. reflexion → extract lessons
2. memory_store → save episodic
3. score_action → update reward${periodic}
Respond with [L1][L2][L3] status.`
    }
  },
  safety: {
    label: 'Safety Gate',
    priority: 4,
    strength: (s) => s.M_emo.mode === 'CAUTION' ? 0.9 : 0,
    instruction: () => `[Brain: Safety — CAUTION mode active]
Fire brain-safety gate for enhanced auditing. All G2/G4/G6 warnings auto-escalate.`
  },
}

// ─── T3: chat.message — new input arrives, signals reset ───
export function onMessage(sessionId, text) {
  const s = getS(sessionId)
  s.cycle++
  s.lastEvent = Date.now()
  s.l1 = new Set()
  s._last_signal = null

  log(`[T3] cycle#${s.cycle} — input arrives, signals reset`)
  log(`[T3] M_emo=${s.M_emo.mode}@${s.M_emo.intensity.toFixed(1)}`)
  log(`[T3] M_rew=${s.M_rew.score.toFixed(1)} M_goal=${s.M_goal.completed}`)

  if (/implement|create|refactor|build|migrate|design/i.test(text) && text.split(' ').length > 15) {
    s.swarm = true
    log(`[T3] complex → action signal boosted`)
  }
}

// ─── T1: onToolBefore — safety fast path (G1) ───
export function onToolBefore(sessionId, tool, args) {
  const cmd = (args.command || '').toString()
  if (tool === 'bash' && /rm\s+-rf\s+\//i.test(cmd)) {
    log(`[T1] G1 BLOCK`)
    throw new Error('G1 BLOCK')
  }
}

// ─── getStrongestSignal() — called from plugin, returns winning signal's instruction ───
// On every tool execution, checks ALL signals, picks the strongest, injects its instruction.
// No sequential phases — the strongest signal at any moment determines the next action.
export function getStrongestSignal(id) {
  const s = S.get(id)
  if (!s) return []

  // Compute all signal strengths
  const results = Object.entries(SIGNALS).map(([key, sig]) => ({
    key,
    label: sig.label,
    strength: sig.strength(s) * sig.priority,
    raw: sig.strength(s),
  }))

  // Sort by strength descending
  results.sort((a, b) => b.strength - a.strength)
  const winner = results[0]

  // Log top signals
  if (winner.raw > 0) {
    const top3 = results.filter(r => r.raw > 0).slice(0, 3)
    log(`[Signals] ${top3.map(r => `${r.key}=${r.raw.toFixed(2)}(×${SIGNALS[r.key].priority})`).join(', ')}`)
  }

  // Dedup: only inject if the winner changed
  if (!winner || winner.raw <= 0 || winner.key === s._last_signal) return []
  s._last_signal = winner.key

  const sig = SIGNALS[winner.key]
  log(`[Signal] WINNER: ${winner.key} (strength=${winner.raw.toFixed(2)})`)
  return [{ role: 'system', content: sig.instruction(s) }]
}

// ─── T2: tool.execute.after — parse results, update state, signals auto-recompute ───
export function onToolAfter(sessionId, tool, args, output) {
  const s = getS(sessionId)
  const cat = (args.category || '').toString()
  const text = (output || '').toString()

  // ── L1 completion → store in working memory, update M_* ──
  if (tool === 'task' && L1_AGENTS.includes(cat)) {
    s.l1.add(cat)
    const key = cat.replace('brain-', '')
    try {
      const p = JSON.parse(text)
      s.wm[key] = p
      if (p.mode) {
        s.M_emo.mode = p.mode; s.M_emo.intensity = p.confidence || 0.5
        s.M_emo.valence = p.valence ?? (p.mode === 'URGENT' ? -0.6 : 0.1)
        s.M_emo.arousal = p.arousal ?? (p.mode === 'URGENT' ? 0.9 : 0.3)
      }
      if (p.score !== undefined) { s.M_rew.score = p.score; s.M_rew.total++ }
    } catch {}
    log(`[T2] L1: ${cat} (${s.l1.size}/5)`)
    return
  }

  // ── Reward detection ──
  if (text.includes('"score"') || text.includes('score_action')) {
    try {
      const p = JSON.parse(text)
      if (p.score !== undefined) {
        s.M_rew.score = p.score
        s.M_rew.history.push(p.score)
        if (s.M_rew.history.length > 100) s.M_rew.history.shift()
      }
    } catch {}
  }

  // ── Task completion → temporal derivative ──
  if (text.includes('PASS') || text.includes('DONE') || text.includes('completed')) {
    const prev = s.M_rew.score
    s.M_goal.completed++
    s.td_error = prev - s.M_rew.score
    log(`[T2] task done → td_err=${s.td_error.toFixed(2)} total=${s.M_goal.completed}`)
  }

  // ── Swarm complete ──
  if (s.swarm && (text.includes('COMPLETE') || text.includes('PASS'))) {
    s.swarm = false
    log(`[T2] swarm done`)
  }
}

// ─── T4: event — lifecycle ───
export function onEvent(type, props) {
  const id = props?.sessionID
  if (!id) return
  const s = getS(id)
  if (type === 'session.idle') {
    const idle = Date.now() - s.lastEvent
    if (idle > 120000) log(`[T4] idle → DMN`)
    if (idle > 1800000) log(`[T4] 30min → health`)
    if (idle > 21600000) log(`[T4] 6h → consolidation`)
  }
  if (type === 'session.error') log(`[T4] error → homeostasis`)
}

// ─── Signal context builder — returns ONLY the winning signal's context ───
// Brain-like: each signal injects only what that processing stream needs.
// No global state broadcast — MCP provides on-demand access.
export function getSignalContext(id) {
  const s = S.get(id)
  if (!s) return ''
  // Compute all signals, find winner
  const results = Object.entries(SIGNALS).map(([key, sig]) => ({
    key, strength: sig.strength(s) * sig.priority, raw: sig.strength(s),
  }))
  results.sort((a, b) => b.strength - a.strength)
  const winner = results[0]
  if (!winner || winner.raw <= 0) return ''
  // Return only the context relevant to the winning signal
  const sig = SIGNALS[winner.key]
  return sig.instruction(s)
}

// ─── State access — for MCP reads, not context injection ───
export function getMentalState(id) { return S.get(id) }
export function getWorkingMemory(id) { return S.get(id)?.wm }
export function getSignalSummary(id) {
  const s = S.get(id)
  if (!s) return ''
  const top = Object.entries(SIGNALS).map(([k,v]) => {
    const st = v.strength(s)
    return st > 0 ? `${k}=${st.toFixed(1)}` : ''
  }).filter(Boolean).join(' ')
  return top || 'idle'
}
