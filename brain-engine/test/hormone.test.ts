// Hormone System Tests — 全局调制器
// RED: HormoneSystem 不存在

import { HormoneSystem } from '../src/core/brain-hormone';
import { HormoneState } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testDefaultState() {
  console.log('\n📋 Default Hormone State');
  const h = new HormoneSystem();
  const s = h.state;
  assert(typeof s.adrenaline === 'number', 'adrenaline exists');
  assert(typeof s.cortisol === 'number', 'cortisol exists');
  assert(typeof s.endorphin === 'number', 'endorphin exists');
  assert(typeof s.dopamine === 'number', 'dopamine exists');
  assert(typeof s.serotonin === 'number', 'serotonin exists');
  assert(typeof s.oxytocin === 'number', 'oxytocin exists');
  assert(s.adrenaline === 0, 'adrenaline starts at 0');
  assert(s.serotonin === 0.5, 'serotonin starts at 0.5');
  assert(s.dopamine === 0.5, 'dopamine starts at 0.5');
}

function testUrgencyRaisesAdrenaline() {
  console.log('\n🚨 URGENT → Adrenaline spike');
  const h = new HormoneSystem();
  h.tick({ mode: 'URGENT', intensity: 0.9 }, { td_error: 0 });
  assert(h.state.adrenaline > 0.5, 'adrenaline spikes on urgent');
}

function testSuccessRaisesEndorphin() {
  console.log('\n💰 Success → Endorphin release');
  const h = new HormoneSystem();
  h.tick({ mode: 'NORMAL', intensity: 0.1 }, { td_error: 1.0 });
  assert(h.state.endorphin > 0, 'endorphin increases on success');
}

function testCortisolDecaysSlowly() {
  console.log('\n🐌 Cortisol decays very slowly');
  const h = new HormoneSystem();
  h.state.cortisol = 0.8;
  for (let i = 0; i < 100; i++) {
    h.tick({ mode: 'NORMAL', intensity: 0.1 }, { td_error: 0 });
  }
  assert(h.state.cortisol > 0.5, 'cortisol barely decays after 100 ticks');
}

function testAdrenalineDecaysFast() {
  console.log('\n⚡ Adrenaline decays quickly');
  const h = new HormoneSystem();
  h.state.adrenaline = 1.0;
  for (let i = 0; i < 10; i++) {
    h.tick({ mode: 'NORMAL', intensity: 0.1 }, { td_error: 0 });
  }
  assert(h.state.adrenaline < 0.5, 'adrenaline decays fast after 10 ticks');
}

function testSupportRaisesOxytocin() {
  console.log('\n🤝 SUPPORT → Oxytocin');
  const h = new HormoneSystem();
  h.tick({ mode: 'SUPPORT', intensity: 0.6 }, { td_error: 0 });
  assert(h.state.oxytocin > 0.3, 'oxytocin increases on support');
}

function testHighAdrenalineConsumesSerotonin() {
  console.log('\n🔄 Adrenaline → Serotonin depletion');
  const h = new HormoneSystem();
  h.state.adrenaline = 1.0;
  h.tick({ mode: 'URGENT', intensity: 0.9 }, { td_error: 0 });
  assert(h.state.serotonin < 0.5, 'serotonin depleted by high adrenaline');
}

function testHighEndorphinReducesCortisol() {
  console.log('\n🔄 Endorphin → Cortisol reduction');
  const h = new HormoneSystem();
  h.state.cortisol = 0.8;
  h.state.endorphin = 0.8;
  h.tick({ mode: 'SUPPORT', intensity: 0.5 }, { td_error: 0.5 });
  assert(h.state.cortisol < 0.8, 'cortisol reduced by endorphin');
}

function testModulateSurpriseThreshold() {
  console.log('\n🎯 Hormone modulates surprise threshold');
  const h = new HormoneSystem();
  // High cortisol → lower threshold → more sensitive
  h.state.cortisol = 0.8;
  const t1 = h.modulateSurpriseThreshold(0.3);
  assert(t1 < 0.3, 'high cortisol lowers threshold');

  // High endorphin → higher threshold → less sensitive
  h.state.endorphin = 0.8;
  h.state.cortisol = 0;
  const t2 = h.modulateSurpriseThreshold(0.3);
  assert(t2 > 0.3, 'high endorphin raises threshold');
}

function testModulateReflexThreshold() {
  console.log('\n🎯 Hormone modulates reflex sensitivity');
  const h = new HormoneSystem();
  // High adrenaline → lower reflex threshold → react faster
  h.state.adrenaline = 0.8;
  const t = h.modulateReflexThreshold(5);
  assert(t < 5, 'high adrenaline lowers reflex threshold');
}

function testModulateMemoryImportance() {
  console.log('\n🎯 Hormone modulates memory encoding');
  const h = new HormoneSystem();
  h.state.adrenaline = 0.8;
  const imp = h.modulateMemoryImportance(0.5);
  assert(imp > 0.5, 'high adrenaline boosts memory importance');
}

// ─── RUN ───
console.log('🧠 HORMONE SYSTEM TESTS');
console.log('='.repeat(50));

testDefaultState();
testUrgencyRaisesAdrenaline();
testSuccessRaisesEndorphin();
testCortisolDecaysSlowly();
testAdrenalineDecaysFast();
testSupportRaisesOxytocin();
testHighAdrenalineConsumesSerotonin();
testHighEndorphinReducesCortisol();
testModulateSurpriseThreshold();
testModulateReflexThreshold();
testModulateMemoryImportance();

console.log(`\n${'='.repeat(50)}`);
console.log(`Hormone: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All hormone tests passed! ✅');
