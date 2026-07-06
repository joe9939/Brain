// Belief Store Tests — 信念存储
// RED: BeliefStore 不存在
// GREEN: 创建最小实现

import { BeliefStore } from '../src/core/belief-store';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testBeliefStoreExists() {
  console.log('\n🆕 BeliefStore Exists');
  const bs = new BeliefStore();
  assert(typeof bs.storePrediction === 'function', 'has storePrediction');
  assert(typeof bs.recordObservation === 'function', 'has recordObservation');
  assert(typeof bs.retrieveBeliefs === 'function', 'has retrieveBeliefs');
  assert(typeof bs.recallSimilar === 'function', 'has recallSimilar');
}

function testStoreAndRetrieve() {
  console.log('\n💾 Store and Retrieve Beliefs');
  const bs = new BeliefStore();

  bs.storePrediction('move_forward', { x: 10 }, 0.8);
  const beliefs = bs.retrieveBeliefs('move_forward');
  assert(beliefs.length === 1, 'retrieve by context returns belief');
  assert(beliefs[0].context === 'move_forward', 'context stored correctly');
  assert(beliefs[0].prediction.x === 10, 'prediction stored');
  assert(beliefs[0].confidence === 0.8, 'confidence stored');
}

function testRecordObservation() {
  console.log('\n📝 Record Observation — updates outcome and surprise');
  const bs = new BeliefStore();

  const id = bs.storePrediction('attack', { damage: 5 }, 0.7);
  bs.recordObservation(id, { damage: 3 }, 0.4);

  const beliefs = bs.retrieveBeliefs('attack');
  assert(beliefs.length === 1, 'belief still exists');
  assert(beliefs[0].outcome.damage === 3, 'outcome recorded');
  assert(beliefs[0].surprise === 0.4, 'surprise recorded');
  // Confidence should decrease after surprise
  assert(beliefs[0].confidence < 0.7, 'confidence decreased after surprise');
}

function testRecallSimilarByTag() {
  console.log('\n🔍 Recall Similar — k-NN by tag');
  const bs = new BeliefStore();

  bs.storePrediction('combat', { damage: 5 }, 0.9, ['combat', 'melee']);
  bs.storePrediction('combat', { damage: 3 }, 0.8, ['combat', 'ranged']);
  bs.storePrediction('mining', { ore: 'iron' }, 0.7, ['mining']);

  const combatBeliefs = bs.recallSimilar('combat', 2);
  assert(combatBeliefs.length === 2, 'returns k=2 combat beliefs');
  
  const miningBeliefs = bs.recallSimilar('mining', 5);
  assert(miningBeliefs.length === 1, 'returns 1 mining belief');
}

function testEmptyStore() {
  console.log('\n📭 Empty Store');
  const bs = new BeliefStore();
  assert(bs.retrieveBeliefs('anything').length === 0, 'empty store returns empty');
  assert(bs.recallSimilar('anything', 3).length === 0, 'empty recall returns empty');
}

function testMaxSize() {
  console.log('\n📏 Max Size — drops oldest');
  const bs = new BeliefStore({ maxSize: 3 });

  bs.storePrediction('a', {}, 0.5);
  bs.storePrediction('b', {}, 0.5);
  bs.storePrediction('c', {}, 0.5);
  assert(bs.retrieveBeliefs('').length === 3, '3 beliefs fit');

  bs.storePrediction('d', {}, 0.5);
  assert(bs.retrieveBeliefs('').length === 3, 'capped at 3 after 4th added');
}

// ─── RUN ───
console.log('🧠 BELIEF STORE TESTS');
console.log('='.repeat(50));

testBeliefStoreExists();
testStoreAndRetrieve();
testRecordObservation();
testRecallSimilarByTag();
testEmptyStore();
testMaxSize();

console.log(`\n${'='.repeat(50)}`);
console.log(`BeliefStore: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All belief store tests passed! ✅');
