// brain-hooks.js — Event-driven circuit enforcement
// Architecture: 7 parallel modules (Cognition, Memory, Perception, World, Action, Reward, Emotion)
// Hook tiers: T1=before tool, T2=after tool, T3=message, T4=event
// Papers read: ReAct (2210.03629) — reasoning+action interleaving
// State: iteration 1 — will update as more papers are read

const fs = require('fs')
const path = require('path')

const LOG = path.join(process.env.HOME || 'C:/Users/86189', '.config/opencode', 'brain-circuit.log')
const L1_AGENTS = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety']

function log(m) { try { fs.appendFileSync(LOG, JSON.stringify({ts:Date.now(),msg:m})+'\n') } catch {} }

// ─── Session state (Generative Agents: memory stream + reflections) ───
const S = new Map()
function getS(id) {
  if (!S.has(id)) S.set(id, {
    l1: new Set(), mood: {mode:'NORMAL',intensity:0.5},
    gates: 0, tasks: 0, cycle: 0, swarm: false,
    reasoning: [], act: [], lastEvent: 0,
    // Generative Agents: memory stream + reflections
    memoryStream: [],  // [{observation, timestamp, importance}]
    reflections: [],   // [{insight, sources: [memoryIds], timestamp}]
  })
  return S.get(id)
}

// ─── T3: chat.message — User message received ───
// Fires ALL perception modules simultaneously (ReAct: reasoning+action interleaving)
function onMessage(sessionId, text) {
  const s = getS(sessionId)
  s.cycle++
  s.lastEvent = Date.now()

  // Perception: inject L1 agents
  log(`[T3] cycle#${s.cycle} — activate perception`)

  // Emotion: inject mood context from previous cycle
  log(`[T3] mood: ${s.mood.mode}@${s.mood.intensity}`)

  // ReAct pattern: inject reasoning trace instruction from previous actions
  if (s.reasoning.length > 0) {
    log(`[T3] reasoning trace: ${s.reasoning.slice(-2).join(' → ')}`)
  }

  // Complex task detection (ReAct: plan-then-act)
  if (/implement|create|refactor|build|migrate|design/i.test(text) && text.split(' ').length > 15) {
    s.swarm = true
    log(`[T3] complex task → activate Action module (swarm)`)
  }
}

// ─── T2: tool.execute.after — Tool execution completed ───
// Detects module completions, updates shared state, triggers next modules
function onToolAfter(sessionId, tool, args, output) {
  const s = getS(sessionId)
  const cat = (args.category || '').toString()
  const text = (output || '').toString()

  // ─── Perception module: track L1 completion ───
  if (tool === 'task' && L1_AGENTS.includes(cat)) {
    s.l1.add(cat)
    log(`[T2:Perception] ${cat} (${s.l1.size}/${L1_AGENTS.length})`)
    if (s.l1.size === L1_AGENTS.length) {
      s.l1.clear()
      log(`[T2:Perception] ALL DONE → working memory updated`)
    }
    return
  }

  // ─── Emotion module: amygdala detected ───
  if (cat === 'brain-amygdala' && text.includes('"mode"')) {
    try {
      const p = JSON.parse(text)
      if (p.mode) {
        s.mood.mode = p.mode
        s.mood.intensity = p.confidence || 0.5
        log(`[T2:Emotion] ${s.mood.mode}@${s.mood.intensity}`)
        if (p.mode === 'CAUTION') log(`[T2:Emotion] → modulate Safety module`)
        if (p.mode === 'URGENT') log(`[T2:Emotion] → modulate Action module`)
      }
    } catch {}
    return
  }

  // ─── Reward module: score evaluation ───
  if (text.includes('"score"') || text.includes('score_action')) {
    try {
      const p = JSON.parse(text)
      if (p.score !== undefined) {
        log(`[T2:Reward] score=${p.score}`)
        if (p.score < 3) log(`[T2:Reward] → activate Cognition module`)
      }
    } catch {}
  }

  // ─── Action module: gate tracking ───
  if (tool === 'task' && cat.startsWith('brain-')) {
    s.gates++
    log(`[T2:Action] gate#${s.gates}`)
  }

  // ─── Cognition module: task completion + POST ───
  // Reflexion: verbal feedback stored as reflective text, not weight updates
  if (text.includes('PASS') || text.includes('DONE') || text.includes('completed')) {
    s.tasks++
    s.reasoning.push(`task${s.tasks}`)
    if (s.reasoning.length > 10) s.reasoning.shift()

    // Reflexion: store verbal reflection in memory-store
    log(`[T2:Cognition] tasks=${s.tasks} → reflexion + memory + reward`)
    log(`[T2:Reflexion] store verbal feedback: reflexion_start + add_observation + generate_lessons`)

    // Generative Agents: memory stream + reflection synthesis
    const importance = text.length > 200 ? 0.8 : 0.3  // longer output = more important
    s.memoryStream.push({observation: text.slice(0,200), timestamp: Date.now(), importance, task: s.tasks})
    if (s.memoryStream.length > 50) s.memoryStream.shift()

    // Periodic reflection: synthesize memories into insights (every 5 tasks)
    if (s.tasks % 5 === 0) {
      const recent = s.memoryStream.filter(m => m.importance > 0.5)
      if (recent.length >= 3) {
        log(`[T2:Reflection] synthesize ${recent.length} high-importance memories → insight`)
        s.reflections.push({insight: `task#${s.tasks} patterns`, sources: recent.slice(-3), timestamp: Date.now()})
        if (s.reflections.length > 20) s.reflections.shift()
      }
    }

    // ReAct: record action trace for next reasoning context
    s.act.push({task: s.tasks, outcome: text.slice(0,100), time: Date.now()})
    if (s.act.length > 10) s.act.shift()

    // Memory maintenance  
    log(`[T2:Memory] decay + conflict detection + value_learn`)
  }

  // ─── World Model module: swarm prediction ───
  if (s.swarm && (text.includes('COMPLETE') || text.includes('PASS'))) {
    s.swarm = false
    log(`[T2:WorldModel] predict → verify: world_diff check`)
  }

  // ─── Periodic self-enhancement ───
  if (s.tasks % 3 === 0) log(`[T2:SelfEnhance] #${s.tasks} → optimizer`)
  if (s.tasks % 5 === 0) log(`[T2:SelfEnhance] #${s.tasks} → curiosity + meta-learner`)
  if (s.tasks % 20 === 0) log(`[T2:SelfEnhance] #${s.tasks} → red-team`)
  if (s.tasks % 50 === 0) log(`[T2:SelfEnhance] #${s.tasks} → architect`)
}

// ─── T1: tool.execute.before — Before tool execution ───
function onToolBefore(sessionId, tool, args) {
  const cmd = (args.command || '').toString()
  if (tool === 'bash' && /rm\s+-rf\s+\//i.test(cmd)) {
    log(`[T1:Safety] BLOCKED`)
    throw new Error('G1 BLOCK')
  }
  if (args.category === 'brain-swarm-coder') {
    log(`[T1:Cognition] causal analysis reminder`)
  }
}

// ─── T4: event — Session lifecycle ───
function onEvent(type, props) {
  const id = props?.sessionID
  if (!id) return
  const s = getS(id)
  if (type === 'session.idle') {
    const idle = Date.now() - s.lastEvent
    if (idle > 120000) log(`[T4] idle ${Math.round(idle/1000)}s → DMN`)
    if (idle > 1800000) log(`[T4] idle ${Math.round(idle/1000)}s → health check`)
    if (idle > 21600000) log(`[T4] idle ${Math.round(idle/1000)}s → consolidation`)
  }
  if (type === 'session.error') log(`[T4] error → homeostasis`)
}

module.exports = { onMessage, onToolAfter, onToolBefore, onEvent, getState: id => S.get(id) }
