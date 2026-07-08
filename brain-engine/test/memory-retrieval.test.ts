// Active Memory Retrieval Tests — hippocampus actively queries episodic/semantic memory

import { MemorySystem } from '../src/core/memory';
import { MentalState } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeState(): MentalState {
  return {
    mem: { working: [], episodic: [], semantic: [], procedural: [] },
    wm: { lastScan: 0, changedFiles: [], codebaseDigest: '', predictions: new Map() },
    emo: { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3, dominance: 0.5 },
    goal: { active: [], completed: 0, history: [] },
    rew: { score: 0, total: 0, td_error: 0, history: [] },
  };
}

function testMemoryQueryOnRelatedInput() {
  console.log('\n🔍 Memory Query — Related input retrieves past episodes');
  const mem = new MemorySystem();
  const state = makeState();

  // Store memory about mining
  mem.addEpisodic({
    content: 'Found diamonds at y=12 near lava',
    importance: 0.8,
    tags: ['mining', 'diamond', 'cave'],
  });

  // Query with related input — uses content matching
  const results = mem.retrieveEpisodic('diamond', 1);
  assert(results.length === 1, 'finds related memory');
  assert(results[0].content.includes('diamonds'), 'content matches');
}

function testSemanticMemoryQuery() {
  console.log('\n📚 Semantic Memory — Related concept retrieves facts');
  const mem = new MemorySystem();

  mem.addSemantic('zombie', ['drops rotten flesh', 'burns in sunlight', 'attack villagers'], 0.9);

  const result = mem.retrieveSemantic('zombie');
  assert(result !== null, 'finds zombie concept');
  assert(result!.facts.length === 3, 'has 3 facts');
}

function testMultipleMemoriesRanked() {
  console.log('\n📊 Memory Ranking — Higher importance comes first');
  const mem = new MemorySystem();

  mem.addEpisodic({ content: 'Minor cave exploring', importance: 0.2, tags: ['cave'] });
  mem.addEpisodic({ content: 'Major diamond discovery!', importance: 0.9, tags: ['cave', 'diamond'] });
  mem.addEpisodic({ content: 'Got lost in cave', importance: 0.5, tags: ['cave'] });

  const results = mem.retrieveEpisodic('cave', 3);
  assert(results.length === 3, 'returns all 3');
  assert(results[0].importance === 0.9, 'highest importance first');
  assert(results[0].content === 'Major diamond discovery!', 'most important content first');
}

function testMemoryAugmentedInput() {
  console.log('\n🧩 Memory-Augmented Input');
  const mem = new MemorySystem();

  mem.addEpisodic({ content: 'Diamonds spawn at y=12', importance: 0.7, tags: ['mining'] });
  mem.addEpisodic({ content: 'Cave spiders are poisonous', importance: 0.6, tags: ['cave', 'combat'] });

  // Simulate what brain-engine does: query + build context
  const query = 'mining for diamonds';
  const episodes = mem.retrieveEpisodic('diamond', 2);

  // Build a memory context string
  const memoryContext = episodes.map(e => `[Past] ${e.content}`).join('\n');
  const augmentedInput = `## Context\n${memoryContext}\n## Task\n${query}`;

  assert(memoryContext.includes('y=12'), 'memory context includes relevant info');
  assert(augmentedInput.includes('[Past]'), 'augmented input has memory prefix');
  assert(episodes.length === 1, 'only 1 relevant episode (not the spider one)');
}

function testEmptyMemory() {
  console.log('\n📭 Empty Memory — No context added');
  const mem = new MemorySystem();
  const results = mem.retrieveEpisodic('anything', 3);
  assert(results.length === 0, 'empty memory returns nothing');
}

function testWorkingMemoryInjection() {
  console.log('\n💾 Working Memory Injection');
  const mem = new MemorySystem();
  const state = makeState();

  mem.addToWorking(state, 'previous action: mining stone');
  mem.addToWorking(state, 'saw a creeper nearby');

  // Working memory should be available as context
  const workingContext = state.mem.working.map(w => `[Recent] ${w}`).join('\n');
  assert(workingContext.includes('mining stone'), 'working memory in context');
  assert(workingContext.includes('creeper'), 'working memory in context');
}

// ─── RUN ───
console.log('🧠 ACTIVE MEMORY RETRIEVAL TESTS');
console.log('='.repeat(50));

testMemoryQueryOnRelatedInput();
testSemanticMemoryQuery();
testMultipleMemoriesRanked();
testMemoryAugmentedInput();
testEmptyMemory();
testWorkingMemoryInjection();

console.log(`\n${'='.repeat(50)}`);
console.log(`MemoryRetrieval: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All memory retrieval tests passed! ✅');
