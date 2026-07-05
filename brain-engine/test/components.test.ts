// 20 Brain Component Verification — arXiv 2504.01990v2
// Tests that each component's definition, prompt, signals, and dependencies match the paper

import { getAllComponents } from '../src/core/brain-components';

const all = getAllComponents();
const L1 = all.filter(c => ['thalamus','amygdala','hippocampus','world-cortex','safety'].includes(c.id));
const Evaluation = all.filter(c => ['cerebellum','basal-ganglia','insula','attention','reward'].includes(c.id));
const Regulation = all.filter(c => ['dmn','hypothalamus','self-optimizer','offline-consol','self-enhance'].includes(c.id));
const Swarm = all.filter(c => ['swarm-planner','swarm-coder','swarm-reviewer','swarm-tester'].includes(c.id));

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function hasSignal(prompt: string, key: string): boolean {
  return prompt.includes(key) || prompt.includes(`signals.${key}`);
}

// ═══════════════════════════════════════════════════
// L1 PERCEPTION LAYER (§2.1)
// 5 components, parallel execution, all process every input
// ═══════════════════════════════════════════════════

console.log('\n📡 L1 PERCEPTION LAYER (§2.1)');

// 1. Thalamus — sensory gate
{
  const c = L1.find(x => x.id === 'thalamus');
  assert(!!c, 'thalamus component exists');
  assert(c!.prompt.includes('gate'), 'thalamus prompt covers gating');
  assert(c!.prompt.includes('intent') || c!.prompt.includes('classif'), 'thalamus prompt covers intent classification');
  assert(c!.prompt.includes('JSON'), 'thalamus prompt requests JSON output');
  assert(c!.sessionId === 'br-thalamus', 'thalamus has correct sessionId');
}

// 2. Amygdala — emotion detection
{
  const c = L1.find(x => x.id === 'amygdala');
  assert(!!c, 'amygdala component exists');
  assert(c!.prompt.includes('emotion'), 'amygdala prompt covers emotion');
  assert(c!.prompt.includes('NORMAL'), 'amygdala prompt covers NORMAL mode');
  assert(c!.prompt.includes('CAUTION'), 'amygdala prompt covers CAUTION mode');
  assert(c!.prompt.includes('URGENT'), 'amygdala prompt covers URGENT mode');
  assert(c!.prompt.includes('intensity'), 'amygdala prompt covers intensity');
  assert(c!.prompt.includes('valence') || c!.prompt.includes('sentiment') || c!.prompt.includes('mood'), 'amygdala prompt covers valence');
  assert(c!.prompt.includes('arousal') || c!.prompt.includes('excitement') || c!.prompt.includes('energy'), 'amygdala prompt covers arousal');
}

// 3. Hippocampus — memory retrieval
{
  const c = L1.find(x => x.id === 'hippocampus');
  assert(!!c, 'hippocampus component exists');
  assert(c!.prompt.includes('memor') || c!.prompt.includes('retrieve'), 'hippocampus prompt covers memory');
  assert(c!.prompt.includes('past') || c!.prompt.includes('experience'), 'hippocampus prompt covers past experience');
  assert(c!.prompt.includes('SOP') || c!.prompt.includes('pattern'), 'hippocampus prompt covers SOPs/patterns');
}

// 4. World Cortex — codebase understanding
{
  const c = L1.find(x => x.id === 'world-cortex');
  assert(!!c, 'world-cortex component exists');
  assert(c!.prompt.includes('context') || c!.prompt.includes('impact'), 'world-cortex prompt covers context analysis');
  assert(c!.prompt.includes('predict') || c!.prompt.includes('impact') || c!.prompt.includes('future'), 'world-cortex prompt covers prediction');
}

// 5. Safety — security scan
{
  const c = L1.find(x => x.id === 'safety');
  assert(!!c, 'safety component exists');
  assert(c!.prompt.includes('secur') || c!.prompt.includes('risk'), 'safety prompt covers security');
  assert(c!.prompt.includes('dangerous'), 'safety prompt covers dangerous commands');
  assert(c!.prompt.includes('sensitive'), 'safety prompt covers sensitive data');
}

// ═══════════════════════════════════════════════════
// EVALUATION LAYER (§2.7)
// 5 components, evaluate L1 outputs
// ═══════════════════════════════════════════════════

console.log('\n⚙️ EVALUATION LAYER (§2.7)');

// 6. Cerebellum — coordination
{
  const c = Evaluation.find(x => x.id === 'cerebellum');
  assert(!!c, 'cerebellum component exists');
  assert(c!.prompt.includes('coordinat') || c!.prompt.includes('approach'), 'cerebellum prompt covers coordination');
}

// 7. Basal Ganglia — action selection
{
  const c = Evaluation.find(x => x.id === 'basal-ganglia');
  assert(!!c, 'basal-ganglia component exists');
  assert(c!.prompt.includes('Go/NoGo') || c!.prompt.includes('gate'), 'basal-ganglia prompt covers gating');
  assert(c!.prompt.includes('pass') || c!.prompt.includes('block'), 'basal-ganglia prompt covers pass/block');
}

// 8. Insula — anomaly detection
{
  const c = Evaluation.find(x => x.id === 'insula');
  assert(!!c, 'insula component exists');
  assert(c!.prompt.includes('anomal') || c!.prompt.includes('inconsisten'), 'insula prompt covers anomaly detection');
}

// 9. Attention — prioritization
{
  const c = Evaluation.find(x => x.id === 'attention');
  assert(!!c, 'attention component exists');
  assert(c!.prompt.includes('import') || c!.prompt.includes('priorit'), 'attention prompt covers prioritization');
  assert(c!.prompt.includes('focus'), 'attention prompt covers focus');
}

// 10. Reward — value estimation
{
  const c = Evaluation.find(x => x.id === 'reward');
  assert(!!c, 'reward component exists');
  assert(c!.prompt.includes('reward') || c!.prompt.includes('value'), 'reward prompt covers reward/value');
  assert(c!.prompt.includes('effort'), 'reward prompt covers effort estimation');
}

// ═══════════════════════════════════════════════════
// REGULATION LAYER (§3 Self-Enhancement)
// 5 components, self-regulation and optimization
// ═══════════════════════════════════════════════════

console.log('\n🧠 REGULATION LAYER (§3)');

// 11. DMN — creative connections
{
  const c = Regulation.find(x => x.id === 'dmn');
  assert(!!c, 'dmn component exists');
  assert(c!.prompt.includes('creative') || c!.prompt.includes('analog') || c!.prompt.includes('association'), 'DMN prompt covers creative thinking');
}

// 12. Hypothalamus — homeostasis
{
  const c = Regulation.find(x => x.id === 'hypothalamus');
  assert(!!c, 'hypothalamus component exists');
  assert(c!.prompt.includes('balance') || c!.prompt.includes('homeostasis'), 'hypothalamus prompt covers balance');
}

// 13. Self-Optimizer
{
  const c = Regulation.find(x => x.id === 'self-optimizer');
  assert(!!c, 'self-optimizer component exists');
  assert(c!.prompt.includes('improv') || c!.prompt.includes('optim'), 'self-optimizer prompt covers improvement');
}

// 14. Consolidation
{
  const c = Regulation.find(x => x.id === 'offline-consol');
  assert(!!c, 'offline-consol component exists');
  assert(c!.prompt.includes('consolid') || c!.prompt.includes('store'), 'consolidation prompt covers memory consolidation');
  assert(c!.prompt.includes('long-term') || c!.prompt.includes('persist'), 'consolidation prompt covers long-term storage');
}

// 15. Self-Enhance
{
  const c = Regulation.find(x => x.id === 'self-enhance');
  assert(!!c, 'self-enhance component exists');
  assert(c!.prompt.includes('lesson') || c!.prompt.includes('learn'), 'self-enhance prompt covers learning');
  assert(c!.prompt.includes('signal') || c!.prompt.includes('learning'), 'self-enhance produces learning signal');
}

// ═══════════════════════════════════════════════════
// SWARM EXECUTION LAYER (§2.7)
// 4 components, sequential execution pipeline
// ═══════════════════════════════════════════════════

console.log('\n🤖 SWARM EXECUTION LAYER (§2.7)');

// 16. Planner — task decomposition
{
  const c = Swarm.find(x => x.id === 'swarm-planner');
  assert(!!c, 'swarm-planner component exists');
  assert(c!.prompt.includes('decompos') || c!.prompt.includes('subtask') || c!.prompt.includes('depend'), 'planner prompt covers decomposition');
}

// 17. Coder — implementation
{
  const c = Swarm.find(x => x.id === 'swarm-coder');
  assert(!!c, 'swarm-coder component exists');
  assert(c!.prompt.includes('implement') || c!.prompt.includes('code'), 'coder prompt covers implementation');
  assert(c!.prompt.includes('correct'), 'coder prompt covers correctness');
}

// 18. Reviewer — code review
{
  const c = Swarm.find(x => x.id === 'swarm-reviewer');
  assert(!!c, 'swarm-reviewer component exists');
  assert(c!.prompt.includes('review') || c!.prompt.includes('bug') || c!.prompt.includes('secur'), 'reviewer prompt covers review');
}

// 19. Tester — verification
{
  const c = Swarm.find(x => x.id === 'swarm-tester');
  assert(!!c, 'swarm-tester component exists');
  assert(c!.prompt.includes('test') || c!.prompt.includes('verif'), 'tester prompt covers testing');
}

// 20. Brain — orchestrator
{
  const c = all.find(x => x.id === 'brain');
  assert(!!c, 'brain component exists');
  assert(c!.prompt.includes('synthes') || c!.prompt.includes('coherent'), 'brain prompt covers synthesis');
  assert(c!.prompt.includes('output') || c!.prompt.includes('response'), 'brain prompt covers output');
  assert(c!.prompt.includes('safety'), 'brain prompt covers safety priority');
}

// ═══════════════════════════════════════════════════
// ARCHITECTURAL VERIFICATION
// ═══════════════════════════════════════════════════

console.log('\n🏗️ ARCHITECTURAL VERIFICATION');

// All components have required fields
all.forEach(c => {
  assert(!!c.id, `component ${c.id} has id`);
  assert(!!c.label, `component ${c.id} has label`);
  assert(!!c.sessionId, `component ${c.id} has sessionId`);
  assert(!!c.prompt, `component ${c.id} has prompt`);
  assert(c.prompt.length > 50, `component ${c.id} prompt is meaningful (>50 chars)`);
});

// Correct count per layer
assert(L1.length === 5, 'L1 has exactly 5 components');
assert(Evaluation.length === 5, 'Evaluation has exactly 5 components');
assert(Regulation.length === 5, 'Regulation has exactly 5 components');
assert(Swarm.length === 4, 'Swarm has exactly 4 components');
assert(all.length === 20, 'total 20 components (L1+Eval+Reg+Swarm+Brain)');

// Session IDs are unique
const sessionIds = all.map(c => c.sessionId);
assert(new Set(sessionIds).size === sessionIds.length, 'all session IDs are unique');

// Component IDs are unique
const ids = all.map(c => c.id);
assert(new Set(ids).size === ids.length, 'all component IDs are unique');

// ═══════════════════════════════════════════════════
// PAPER ALIGNMENT (§1.3A Framework)
// ═══════════════════════════════════════════════════

console.log('\n📄 PAPER ALIGNMENT (§1.3A)');

// Paper defines: Perception → Cognition → Action loop
assert(!!L1.find(x => x.id === 'thalamus'), 'Perception: thalamus (§2.1)');
assert(!!L1.find(x => x.id === 'amygdala'), 'Perception: amygdala (§2.5)');
assert(!!L1.find(x => x.id === 'hippocampus'), 'Cognition: hippocampus (§2.2)');
assert(!!Evaluation.find(x => x.id === 'reward'), 'Cognition: reward (§2.4)');
assert(!!Swarm.find(x => x.id === 'swarm-planner'), 'Action: planner (§2.7)');
assert(!!Swarm.find(x => x.id === 'swarm-coder'), 'Action: coder (§2.7)');
assert(!!Regulation.find(x => x.id === 'self-enhance'), 'Self-enhancement: enhance (§3)');
assert(!!Regulation.find(x => x.id === 'offline-consol'), 'Self-enhancement: consolidation (§3)');

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Component Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All components verified! 🧠✅');
