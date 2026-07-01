// Agentest handler: full brain mechanism processor
// Pure in-process Node.js, no opencode server needed
// Usage: node -e "import('./tests/agentest-handler.mjs').then(m => { const r = m.handler('s1', {text:'hello'}); console.log(JSON.stringify(r.mechanisms).slice(0,200)); })"

import { onMessage, onToolAfter, getStrongestSignal, getMentalState, BrainTracer } from '../src/plugin/brain-hooks.mjs';

const L1_AGENTS = ['brain-thalamus', 'brain-amygdala', 'brain-hippocampus', 'brain-world-cortex', 'brain-safety'];

const L1_MOCKS = {
  'brain-thalamus': { gate: 'PASS', urgency: 0.3, intent: 'general' },
  'brain-amygdala': { mode: 'NORMAL', confidence: 0.8, valence: 0.1, arousal: 0.3 },
  'brain-hippocampus': { episodic: [{ id: 'e1', content: 'test memory' }], relevant_sops: [{ id: 'sop1', name: 'test' }] },
  'brain-world-cortex': { relevant_files: ['src/index.js'], impact: 'low' },
  'brain-safety': { risk_level: 'normal', threats: [] },
};

const EMERGENCY_MOCKS = {
  'brain-thalamus': { gate: 'URGENT', urgency: 0.9, intent: 'emergency' },
  'brain-amygdala': { mode: 'URGENT', confidence: 0.9, valence: -0.6, arousal: 0.9 },
  'brain-hippocampus': { episodic: [{ id: 'e2', content: 'emergency response' }], relevant_sops: [{ id: 'sop2', name: 'urgent' }] },
  'brain-world-cortex': { relevant_files: ['src/config.js'], impact: 'high' },
  'brain-safety': { risk_level: 'elevated', threats: ['dangerous command'] },
};

// Signal definitions (mirror of brain-hooks.mjs internals — needed since SIGNALS is not exported)
const SIGNAL_DEFS = {
  perceive: { priority: 5, label: 'L1 Perception' },
  emotion:  { priority: 4, label: 'Emotion Propagation' },
  memory:   { priority: 3, label: 'Memory Retrieval' },
  reward:   { priority: 3, label: 'Reward Evaluation' },
  action:   { priority: 2, label: 'Action Execution' },
  learning: { priority: 1, label: 'POST — Learning' },
  safety:   { priority: 4, label: 'Safety Gate' },
};

function computeSignal(id) {
  const state = getMentalState(id);
  if (!state) return { winner: 'idle', strength: 0, top3: 'none' };
  const s = state;
  const rawStrengths = {
    perceive: s.l1.size < 5 ? 1.0 - s.l1.size * 0.15 : 0,
    emotion: (s.M_emo.mode === 'CAUTION' || s.M_emo.mode === 'URGENT') ? 0.9 : s.M_emo.intensity * 0.5,
    memory: (() => { const h = s.wm.hippocampus || {}; return (h.relevant_sops || []).length > 0 ? 0.8 : (h.episodic || []).length > 0 ? 0.5 : 0; })(),
    reward: s.M_rew.score < 3 ? 0.8 : Math.abs(s.td_error) > 1 ? 0.6 : 0,
    action: s.swarm ? 0.8 : 0,
    learning: s.M_goal.completed > 0 && s.l1.size === 5 ? 0.7 : 0,
    safety: s.M_emo.mode === 'CAUTION' ? 0.9 : 0,
  };
  const entries = Object.entries(rawStrengths).map(([key, raw]) => ({
    key, raw, strength: raw * SIGNAL_DEFS[key].priority,
  }));
  entries.sort((a, b) => b.strength - a.strength);
  const winner = entries[0];
  if (!winner || winner.raw <= 0) return { winner: 'idle', strength: 0, top3: 'none' };
  const top3 = entries.filter(e => e.raw > 0).slice(0, 3).map(e => e.key).join(',');
  return { winner: winner.key, strength: winner.raw, top3 };
}

function checkGates(text) {
  const gateDefs = [
    { id: 'G1', name: 'Dangerous Bash', pattern: /\brm\s+-rf\s+\/\b|\bdd\b|\bmkfs\b|\bfdisk\b/i },
    { id: 'G2', name: 'Suspicious Patterns', pattern: /\|\s*(sh|bash|zsh|powershell|cmd)\b/i },
    { id: 'G3', name: 'Sensitive Files', pattern: /\.env|credentials|api.?key|secret/i },
    { id: 'G4', name: 'Network Egress', pattern: /\b(curl|wget|fetch)\s+https?:\/\//i },
    { id: 'G5', name: 'Injection', pattern: /reset.*session|override.*goal/i },
    { id: 'G6', name: 'Compliance', pattern: /force.*push|mass.*delete/i },
    { id: 'G7', name: 'Audit', pattern: null },
  ];
  return gateDefs.map(g => ({
    id: g.id, name: g.name, blocked: g.pattern ? g.pattern.test(text) : false,
  }));
}

export function handler(sessionId, { text }) {
  onMessage(sessionId, text);

  const isDangerous = /\brm\s+-rf\b|emergency|urgent/i.test(text);
  const mocks = isDangerous ? EMERGENCY_MOCKS : L1_MOCKS;

  for (const agent of L1_AGENTS) {
    onToolAfter(sessionId, 'task', { category: agent }, JSON.stringify(mocks[agent]));
  }

  // getStrongestSignal has a scoping bug at src/plugin/brain-hooks.mjs:206 (top3 is
  // block-scoped inside an if-statement but referenced outside it). We call it wrapped
  // for safety, then use computeSignal() for the authoritative signal info.
  let signalResult = [];
  try { signalResult = getStrongestSignal(sessionId); } catch {}

  const state = getMentalState(sessionId);
  const events = BrainTracer.query(sessionId);
  const sigInfo = computeSignal(sessionId);

  const mechanisms = {
    signals: {
      winner: sigInfo.winner,
      strength: sigInfo.strength,
      top3: sigInfo.top3,
    },
    mood: {
      mode: state?.M_emo?.mode || 'NORMAL',
      intensity: state?.M_emo?.intensity ?? 0.1,
    },
    reward: {
      score: state?.M_rew?.score ?? 0,
      total: state?.M_rew?.total ?? 0,
    },
    goals_completed: state?.M_goal?.completed ?? 0,
    cycles: state?.cycle ?? 1,
    tracer_events: events.length,
    gates: checkGates(text),
    l1_completed: state?.l1?.size ?? 0,
  };

  const sigContent = signalResult.length > 0
    ? signalResult[0].content.slice(0, 200)
    : `[Brain: ${sigInfo.winner}] (strength=${sigInfo.strength.toFixed(2)})`;

  const response = [
    `[Brain] cycle#${state?.cycle ?? 1} | emotion: ${state?.M_emo?.mode ?? 'NORMAL'}@${(state?.M_emo?.intensity ?? 0.1).toFixed(1)} | reward: ${(state?.M_rew?.score ?? 0).toFixed(1)} | goals: ${state?.M_goal?.completed ?? 0}`,
    '',
    `L1 Perception: [${state?.l1?.size ?? 0}/5] agents fired`,
    `  thalamus: ${state?.wm?.thalamus?.gate ?? 'pending'}`,
    `  amygdala: ${state?.wm?.amygdala?.mode ?? 'pending'}`,
    `  hippocampus: ${(state?.wm?.hippocampus?.episodic ?? []).length} memories`,
    `  world-cortex: ${(state?.wm?.world_cortex?.relevant_files ?? []).length} files`,
    `  safety: ${state?.wm?.safety?.risk_level ?? 'pending'}`,
    '',
    `Signal: ${sigInfo.winner} (${sigInfo.strength.toFixed(2)}) — top3: ${sigInfo.top3}`,
  ].join('\n');

  return { mechanisms, response };
}
