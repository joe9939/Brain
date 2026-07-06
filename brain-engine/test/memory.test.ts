// Memory System Tests — §2.2: 记忆系统单元测试
// 测试工作记忆/情景/语义/SOP的全生命周期

import { MemorySystem } from '../src/core/memory';
import { MentalState, SOP } from '../src/core/types';

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

function testWorkingMemory() {
  console.log('\n💾 Working Memory');
  const mem = new MemorySystem();
  const state = makeState();

  mem.addToWorking(state, 'item 1');
  assert(state.mem.working.length === 1, 'adds first item');

  mem.addToWorking(state, 'item 2');
  mem.addToWorking(state, 'item 3');
  assert(state.mem.working.length === 3, 'adds multiple items');
  assert(state.mem.working[0] === 'item 1', 'preserves order');
}

function testWorkingMemoryConsolidation() {
  console.log('\n🔄 Working Memory Consolidation');
  const mem = new MemorySystem();
  const state = makeState();

  // Fill working memory to trigger consolidation
  mem.addToWorking(state, 'a');
  mem.addToWorking(state, 'b');
  mem.addToWorking(state, 'c');
  mem.addToWorking(state, 'd');
  mem.addToWorking(state, 'e');
  assert(state.mem.working.length === 5, '5 items fit');

  // This should trigger consolidation + shift
  mem.addToWorking(state, 'f');
  assert(state.mem.working.length === 5, 'working capped at 5');
  assert(state.mem.working[4] === 'f', 'newest item present');
}

function testEpisodicMemory() {
  console.log('\n📝 Episodic Memory');
  const mem = new MemorySystem();

  const ep = mem.addEpisodic({
    content: 'System started successfully',
    importance: 0.9,
    tags: ['system', 'startup'],
  });
  assert(ep.id.startsWith('ep-'), 'episodic id starts with ep-');
  assert(typeof ep.timestamp === 'number', 'timestamp set');
  assert(ep.importance === 0.9, 'importance preserved');
  assert(ep.tags.includes('system'), 'tags preserved');

  // Default importance
  const ep2 = mem.addEpisodic({ content: 'minor event', tags: [] });
  assert(ep2.importance === 0.5, 'default importance is 0.5');
}

function testEpisodicRetrieval() {
  console.log('\n🔍 Episodic Retrieval');
  const mem = new MemorySystem();

  mem.addEpisodic({ content: 'User logged in from Tokyo', importance: 0.7, tags: ['login'] });
  mem.addEpisodic({ content: 'Database backup completed', importance: 0.3, tags: ['maintenance'] });
  mem.addEpisodic({ content: 'Tokyo server deployment', importance: 0.8, tags: ['deploy'] });

  const results = mem.retrieveEpisodic('Tokyo', 2);
  assert(results.length === 2, 'returns k=2 results');
  // Should be sorted by importance descending
  assert(results[0].importance >= results[1].importance, 'sorted by importance desc');

  // Tag search
  const tagResults = mem.retrieveEpisodic('login', 5);
  assert(tagResults.length >= 1, 'finds by tag');
}

function testSemanticMemory() {
  console.log('\n📚 Semantic Memory');
  const mem = new MemorySystem();

  const s1 = mem.addSemantic('TypeScript', ['is a typed language', 'compiles to JavaScript']);
  assert(s1.id.startsWith('sem-'), 'semantic id starts with sem-');
  assert(s1.concept === 'TypeScript', 'concept stored');
  assert(s1.facts.length === 2, 'facts stored');
  assert(s1.confidence === 0.5, 'default confidence');

  // Add more facts to existing concept
  const s2 = mem.addSemantic('TypeScript', ['supports generics']);
  assert(s2.facts.length === 3, 'merged facts');
  assert(s2.confidence > 0.5, 'confidence increased');
}

function testSemanticRetrieval() {
  console.log('\n🔍 Semantic Retrieval');
  const mem = new MemorySystem();

  mem.addSemantic('React', ['is a UI library', 'uses JSX']);
  const r = mem.retrieveSemantic('react');
  assert(r !== null, 'finds by lowercase');
  assert(r!.concept === 'React', 'original casing preserved');

  const r2 = mem.retrieveSemantic('nonexistent');
  assert(r2 === null, 'returns null for missing concept');
}

function testProceduralMemorySOP() {
  console.log('\n📋 Procedural Memory (SOP)');
  const mem = new MemorySystem();

  const sop: SOP = {
    id: 'deploy-app',
    trigger: 'deploy',
    steps: ['git pull', 'npm install', 'npm run build'],
    context: 'app deployment',
    frequency: 0,
  };
  mem.addSOP(sop);
  assert(mem.matchSOP('deploy the app') !== null, 'matches by trigger string');

  // Regex trigger
  const sop2: SOP = {
    id: 'fix-bug',
    trigger: /bug|fix|error/i,
    steps: ['reproduce', 'fix', 'test'],
    context: 'bug fixing',
    frequency: 0,
  };
  mem.addSOP(sop2);
  assert(mem.matchSOP('Found a critical bug!') !== null, 'matches by regex');
  assert(mem.matchSOP('No match here 12345') === null, 'no match for unrelated input');
}

function testSOPFrequency() {
  console.log('\n📊 SOP Frequency');
  const mem = new MemorySystem();

  const sop: SOP = {
    id: 'frequent-task',
    trigger: 'build',
    steps: ['compile'],
    context: 'build',
    frequency: 0,
  };
  mem.addSOP(sop);
  assert(mem.matchSOP('build')?.frequency === 1, 'frequency incremented on re-add');
}

function testForgetting() {
  console.log('\n🧹 Forgetting');
  const mem = new MemorySystem();

  // Add old memories
  for (let i = 0; i < 10; i++) {
    mem.addEpisodic({
      content: `memory ${i}`,
      importance: i / 10,
      tags: [],
    });
  }

  // forgetOld with very short cutoff should wipe all
  mem.forgetOld(0); // 0 days old
  const stats = mem.stats();
  assert(stats.episodic === 0, 'all memories forgotten with 0-day cutoff');
}

function testStats() {
  console.log('\n📈 Stats');
  const mem = new MemorySystem();
  const state = makeState();

  const s1 = mem.stats();
  assert(typeof s1.episodic === 'number', 'episodic count');
  assert(typeof s1.semantic === 'number', 'semantic count');
  assert(typeof s1.procedural === 'number', 'procedural count');
  assert(s1.working === 0, 'working via state');
}

// ─── RUN ───
console.log('🧠 MEMORY SYSTEM UNIT TESTS');
console.log('='.repeat(50));

testWorkingMemory();
testWorkingMemoryConsolidation();
testEpisodicMemory();
testEpisodicRetrieval();
testSemanticMemory();
testSemanticRetrieval();
testProceduralMemorySOP();
testSOPFrequency();
testForgetting();
testStats();

console.log(`\n${'='.repeat(50)}`);
console.log(`Memory: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All memory tests passed! ✅');
