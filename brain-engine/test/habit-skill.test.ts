// Habit Skill Memory Tests — 技能记忆 (怎么做, 不只是做了几次)
// RED: SkillMemory 不存在

import { HabitLayer } from '../src/core/habit-layer';
import { Action } from '../src/core/types';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testSkillLearn() {
  console.log('\n📖 Skill Learn — records execution details');
  const hl = new HabitLayer();
  hl.learnSkill('mine_stone', { type: 'dig', params: { block: 'stone' } }, {
    tool: 'stone_pickaxe',
    durationMs: 1500,
    result: 'cobblestone',
    context: 'cave',
  });
  const skill = hl.getSkill('mine_stone');
  assert(skill !== null, 'skill exists');
  assert(skill!.tool === 'stone_pickaxe', 'tool recorded');
  assert(skill!.result === 'cobblestone', 'result recorded');
  assert(skill!.frequency === 1, 'frequency starts at 1');
}

function testSkillUpdatesOnRepeat() {
  console.log('\n📊 Skill Updates — repeated learning improves stats');
  const hl = new HabitLayer();
  hl.learnSkill('mine_stone', { type: 'dig', params: {} }, { tool: 'wooden_pickaxe', durationMs: 3000, result: 'cobblestone' });
  hl.learnSkill('mine_stone', { type: 'dig', params: {} }, { tool: 'stone_pickaxe', durationMs: 1500, result: 'cobblestone' });
  hl.learnSkill('mine_stone', { type: 'dig', params: {} }, { tool: 'iron_pickaxe', durationMs: 800, result: 'cobblestone' });
  const skill = hl.getSkill('mine_stone');
  assert(skill!.frequency === 3, 'frequency = 3');
  // Best tool should be the fastest one
  assert(skill!.bestTool === 'iron_pickaxe', 'bestTool recorded');
  assert(skill!.bestDuration === 800, 'bestDuration tracked');
}

function testSkillWithoutTool() {
  console.log('\n🖐️ Skill Without Tool — bare hand');
  const hl = new HabitLayer();
  hl.learnSkill('attack_zombie', { type: 'attack', params: {} }, {
    result: 'damage_dealt',
  });
  const skill = hl.getSkill('attack_zombie');
  assert(skill !== null, 'skill stored without tool');
  assert(skill!.result === 'damage_dealt', 'result recorded');
}

function testBackwardCompatLearn() {
  console.log('\n🔄 Backward Compat — old learn() still works');
  const hl = new HabitLayer();
  hl.learn('old_habit', { type: 'chat', params: { message: 'hi' } });
  const matched = hl.match('old_habit');
  assert(matched !== null, 'old habit still matches');
  assert(matched!.frequency === 1, 'frequency tracked');
}

function testSkillStats() {
  console.log('\n📈 Skill Stats');
  const hl = new HabitLayer();
  hl.learnSkill('dig_stone', { type: 'dig', params: {} }, { durationMs: 2000, result: 'cobblestone' });
  hl.learnSkill('dig_stone', { type: 'dig', params: {} }, { durationMs: 1500, result: 'cobblestone' });
  hl.learnSkill('dig_wood', { type: 'dig', params: {} }, { durationMs: 1000, result: 'wood' });
  
  const skill1 = hl.getSkill('dig_stone');
  assert(skill1!.bestDuration === 1500, 'best duration from 2 attempts');
  assert(skill1!.frequency === 2, 'frequency 2');
  
  const all = hl.getAllSkillDetails();
  assert(all.length === 2, '2 skills total');
}

function testLearnFromOutcome() {
  console.log('\n🎯 Learn From Outcome — records params + result');
  const hl = new HabitLayer();
  hl.learnFromOutcome('dig_diamond', { type: 'dig', params: {} }, {
    tool: 'iron_pickaxe',
    durationMs: 500,
    result: 'diamond',
    success: true,
  });
  const skill = hl.getSkill('dig_diamond');
  assert(skill !== null, 'skill created');
  assert(skill!.successRate > 0, 'success rate tracked');
}

// ─── RUN ───
console.log('🧠 SKILL MEMORY TESTS');
console.log('='.repeat(50));

testSkillLearn();
testSkillUpdatesOnRepeat();
testSkillWithoutTool();
testBackwardCompatLearn();
testSkillStats();
testLearnFromOutcome();

console.log(`\n${'='.repeat(50)}`);
console.log(`SkillMemory: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All skill memory tests passed! ✅');
