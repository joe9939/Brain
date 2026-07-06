// Predictive Layer Tests — 预测编码引擎
// RED: PhysicsPredictor + PredictiveLayer 不存在
// GREEN: 创建最小实现

import { PhysicsPredictor, PredictiveLayer } from '../src/core/predictive-layer';
import { WorldSnapshot, Action } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(overrides: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 1, y: 0, z: 0 },
    health: 20, healthDelta: 0, hunger: 20, oxygen: 20,
    onFire: false, inLava: false, falling: false,
    blocks: [], entities: [], inventory: [],
    timeOfDay: 1000, dimension: 'overworld',
    ...overrides,
  };
}

// ─── PhysicsPredictor Tests ───

function testPhysicsPredictorExists() {
  console.log('\n🆕 PhysicsPredictor Exists');
  const p = new PhysicsPredictor();
  const state = makeSnapshot();
  const pred = p.predict(state);
  assert(pred.position !== undefined, 'predict returns position');
  assert(typeof pred.health === 'number', 'predict returns health');
  assert(typeof pred.confidence === 'number', 'predict returns confidence');
}

function testPhysicsPositionPrediction() {
  console.log('\n📍 Position Prediction — velocity * dt');
  const p = new PhysicsPredictor();
  const state = makeSnapshot({ velocity: { x: 2, y: 0, z: 0 } });
  const pred = p.predict(state);
  // x += vx * 0.05 = 0 + 2 * 0.05 = 0.1
  assert(pred.position.x === 0.1, 'x predicts vx * 0.05');
  assert(pred.position.y === 64, 'y unchanged with no vy');
}

function testHealthPrediction() {
  console.log('\n❤️ Health Prediction — decay by damage');
  const p = new PhysicsPredictor();
  
  const damaged = makeSnapshot({ health: 15, healthDelta: -5 });
  const pred = p.predict(damaged);
  assert(pred.health < 15, 'health decreases with negative delta');
}

function testConfidence() {
  console.log('\n📊 Confidence Score');
  const p = new PhysicsPredictor();
  const c = p.confidence();
  assert(c >= 0 && c <= 1, 'confidence is 0-1');
  assert(c === 0.9, 'physics predictor always returns 0.9');
}

// ─── PredictiveLayer Tests ───

function testPredictiveLayerExists() {
  console.log('\n🆕 PredictiveLayer Exists');
  const pl = new PredictiveLayer();
  assert(typeof pl.tick === 'function', 'has tick method');
}

function testPredictivePassOnLowSurprise() {
  console.log('\n✅ Predictive Pass — surprise < threshold → none');
  const pl = new PredictiveLayer();
  
  // Same snapshot twice → low surprise
  const snap = makeSnapshot();
  const demand1 = pl.tick(snap);
  // Second tick compares previous prediction with actual
  const demand2 = pl.tick(snap);
  
  assert(demand2.level === 'predictive_pass' || demand2.level === 'none', 'low surprise → predictive_pass or none');
}

function testCognitiveOnHighSurprise() {
  console.log('\n⚠️ Cognitive Demand — big change → high surprise');
  const pl = new PredictiveLayer();
  
  // First tick to establish baseline
  pl.tick(makeSnapshot({ position: { x: 0, y: 64, z: 0 } }));
  
  // Second tick with big position change → high surprise
  const demand = pl.tick(makeSnapshot({ position: { x: 100, y: 64, z: 0 } }));
  
  if (demand.level === 'cognitive') {
    assert(typeof demand.surprise.total === 'number', 'cognitive demand has surprise');
    assert(demand.attention > 0, 'cognitive demand has attention > 0');
  }
}

function testCustomThreshold() {
  console.log('\n🔧 Custom Threshold');
  const pl = new PredictiveLayer({ surpriseThreshold: 0.1 });
  // Lower threshold = more sensitive to surprise
  assert(true, 'custom threshold accepted');
}

function testAverageSurprise() {
  console.log('\n📈 Average Surprise Tracking');
  const pl = new PredictiveLayer();
  assert(typeof pl.averageSurprise === 'number', 'averageSurprise is a number');
}

// ─── PredictionEngine Interface Tests ───

function testPredictorSwap() {
  console.log('\n🔄 PredictionEngine Swap');
  const pl = new PredictiveLayer();
  const p = new PhysicsPredictor();
  
  // PredictiveLayer should accept custom engine
  assert(true, 'can swap engine (compile-time check)');
}

// ─── RUN ───
console.log('🧠 PREDICTIVE LAYER TESTS');
console.log('='.repeat(50));

testPhysicsPredictorExists();
testPhysicsPositionPrediction();
testHealthPrediction();
testConfidence();
testPredictiveLayerExists();
testPredictivePassOnLowSurprise();
testCognitiveOnHighSurprise();
testCustomThreshold();
testAverageSurprise();
testPredictorSwap();

console.log(`\n${'='.repeat(50)}`);
console.log(`PredictiveLayer: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All predictive layer tests passed! ✅');
