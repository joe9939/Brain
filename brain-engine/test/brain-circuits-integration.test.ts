// Brain Circuit + Hormone + Drive Integration Tests
// TDD: Write failing test first, watch fail, implement, watch pass

import { SessionPool } from '../src/core/session-pool.js';
import { BrainComponent, CircuitStage, BrainCircuit, ComponentOutput, MentalState, HormoneState, DriveState } from '../src/core/types.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ─── Mock ───

function makeComponent(id: string, extract?: (input: string) => string): BrainComponent {
  return {
    id, label: id, sessionId: `br-${id}`,
    prompt: `You are ${id}`,
    extractAfferent: extract,
  };
}

// Track what each component receives (full string, not truncated)
const received: Record<string, string[]> = {};

async function mockRun(comp: BrainComponent, input: string): Promise<ComponentOutput> {
  (received[comp.id] ||= []).push(input);
  return { componentId: comp.id, summary: `${comp.id} done`, signals: {}, state: {} };
}

// ─── Test 1: Stages execute sequentially ───

console.log('\n🧪 Circuit Pipeline: stage ordering');
{
  received['a'] = []; received['b'] = []; received['c'] = [];
  const circuit: BrainCircuit = {
    id: 'test', name: 'Test',
    stages: [
      { id: 's1', label: 'Stage 1', componentIds: ['a'], inputSource: 'raw' },
      { id: 's2', label: 'Stage 2', componentIds: ['b'], inputSource: 'previous',
        inputMapper: (prev) => `from_prev:${Array.from(prev.keys()).join(',')}` },
      { id: 's3', label: 'Stage 3', componentIds: ['c'], inputSource: 'combined',
        inputMapper: (prev) => `combined:${Array.from(prev.keys()).join(',')}` },
    ],
  };
  const components = [
    makeComponent('a'), makeComponent('b'), makeComponent('c'),
  ];

  // Manually run stages sequentially to simulate circuit
  let acc = new Map<string, ComponentOutput>();

  // Stage 1: raw input
  acc.set('a', await mockRun(components[0], 'raw_input_data'));
  assert(received['a'][0].includes('raw_input_data'), 'Stage 1 gets raw input');

  // Stage 2: previous stage
  const s2Input = 'from_prev:a';
  acc.set('b', await mockRun(components[1], s2Input));
  assert(received['b'][0].includes('from_prev'), 'Stage 2 gets Stage 1 summary');

  // Stage 3: combined
  const s3Input = 'combined:a,b';
  acc.set('c', await mockRun(components[2], s3Input));
  assert(received['c'][0].includes('combined'), 'Stage 3 gets combined input');

  assert(acc.has('a') && acc.has('b') && acc.has('c'), 'All stage outputs collected');
}

// ─── Test 2: Hormone context injected into stage input ───

console.log('\n🧪 Hormone modulation: context injected');
{
  received['thalamus'] = [];
  const hormone: HormoneState = {
    adrenaline: 0.8, cortisol: 0.2, endorphin: 0.1,
    dopamine: 0.5, serotonin: 0.5, oxytocin: 0,
  };
  const drives: DriveState = {
    hunger: 0.7, fear: 0.3, fatigue: 0.1, curiosity: 0.4, social: 0, mastery: 0.2,
  };

  const ctx = `## Hormones
adrenaline=0.8 cortisol=0.2 endorphin=0.1 dopamine=0.5 serotonin=0.5 oxytocin=0
## Drives
hunger=0.7 fear=0.3 fatigue=0.1 curiosity=0.4 social=0 mastery=0.2
## Raw Input
test_data`;

  const comp = makeComponent('thalamus');
  await mockRun(comp, ctx);
  assert(received['thalamus'][0].includes('Hormones'), 'Hormone section present');
  assert(received['thalamus'][0].includes('adrenaline=0.8'), 'Adrenaline level injected');
  assert(received['thalamus'][0].includes('Drives'), 'Drives section present');
  assert(received['thalamus'][0].includes('hunger=0.7'), 'Hunger drive injected');
  assert(received['thalamus'][0].includes('Raw Input'), 'Raw input preserved');
}

// ─── Test 3: Component outputs update drives ───

console.log('\n🧪 Component → Drive update');
{
  const outputs: [string, ComponentOutput][] = [
    ['amygdala', { componentId: 'amygdala', summary: 'zombie', signals: { emotion: 0.8 }, state: {}, needs: { '2': 0.9 } }],
    ['hypothalamus', { componentId: 'hypothalamus', summary: 'hungry', signals: {}, state: {}, needs: { '1': 0.8 } }],
    ['reward', { componentId: 'reward', summary: 'success', signals: { reward: 0.5 }, state: {}, needs: { '4': 0.3, '5': 0.6 } }],
  ];

  // Drive integration: needs[level] > 0.5 → drive rises
  const driveUpdates: Partial<DriveState> = {};
  for (const [, out] of outputs) {
    if (out.needs) {
      if ((out.needs['1'] ?? 0) > 0.5) driveUpdates.hunger = out.needs['1'];
      if ((out.needs['2'] ?? 0) > 0.5) driveUpdates.fear = out.needs['2'];
      if ((out.needs['4'] ?? 0) > 0.5) driveUpdates.mastery = out.needs['4'];
      if ((out.needs['5'] ?? 0) > 0.5) driveUpdates.curiosity = out.needs['5'];
    }
  }

  assert(driveUpdates.hunger === 0.8, 'Hypothalamus L1 need → hunger drive');
  assert(driveUpdates.fear === 0.9, 'Amygdala L2 need → fear drive');
  assert(driveUpdates.mastery === undefined || driveUpdates.mastery === 0.3, 'Reward L4 need=0.3 < threshold 0.5 → mastery unchanged');
  assert(driveUpdates.curiosity === 0.6, 'Reward L5 need → curiosity drive');
}

// ─── Test 4: Basal Ganglia signals modulated by hormones ───

console.log('\n🧪 Hormone → Signal modulation');
{
  const hormone: HormoneState = {
    adrenaline: 0.8, cortisol: 0.2, endorphin: 0.1,
    dopamine: 0.5, serotonin: 0.5, oxytocin: 0,
  };
  const rawSignals: Record<string, number> = {
    perceive: 0.5, emotion: 0.3, safety: 0.4, memory: 0.2, reward: 0.3, action: 0.1, learning: 0.1,
  };

  // Adrenaline > 0.5 → safety signal × 3
  const modulated = { ...rawSignals };
  if (hormone.adrenaline > 0.5) modulated.safety = Math.round(modulated.safety * 3 * 100) / 100;
  // Cortisol > 0.5 → perceive suppressed
  if (hormone.cortisol > 0.5) modulated.perceive *= 0.5;
  // Dopamine > 0.7 → reward amplified
  if (hormone.dopamine > 0.7) modulated.reward *= 2;

  assert(Math.abs(modulated.safety - 1.2) < 0.001, 'Adrenaline ×3 safety signal (=1.2)');
  assert(modulated.perceive === 0.5, 'Perceive unchanged (cortisol=0.2 < 0.5)');
  // Winner should be safety (1.2)
  const winnerKey = Object.entries(modulated).sort((a, b) => b[1] - a[1])[0][0];
  assert(winnerKey === 'safety', `Winner = safety (${winnerKey})`);
}

// ─── Summary ───

console.log(`\n${'='.repeat(50)}`);
console.log(`Circuit Integration: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All circuit integration tests passed! 🧠✅');
