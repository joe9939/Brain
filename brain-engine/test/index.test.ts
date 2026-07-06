// Barrel Export Tests — index.ts 入口导出验证
// RED: 先看失败 (index.ts 不存在)
// GREEN: 创建最小导出
// REFACTOR: 保持所有导出可访问

import { BrainEngine } from '../src/index';
import type { MentalState, SignalResult, GateResult, OutputRouter, BrainComponent } from '../src/index';
import { readFileSync } from 'fs';

const env = readFileSync('C:/Users/86189/Desktop/brain-agent/.env', 'utf8');
const match = env.match(/DEEPSEEK_API_KEY=(.+)/);
const API_KEY = match?.[1] || '';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testCoreExports() {
  console.log('\n📦 Core Class Exports');
  assert(typeof BrainEngine === 'function', 'BrainEngine is exported as class/function');
}

function testTypeExports() {
  console.log('\n📦 Type Exports');
  // These verify the types are importable (compile-time check)
  assert(true, 'MentalState type importable');
  assert(true, 'SignalResult type importable');
  assert(true, 'GateResult type importable');
  assert(true, 'OutputRouter type importable');
  assert(true, 'BrainComponent type importable');
}

function testBrainEngineInstantiation() {
  console.log('\n🏗️ BrainEngine Instantiation');
  const engine = new BrainEngine({ apiKey: API_KEY, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  assert(engine instanceof BrainEngine, 'BrainEngine can be instantiated');
  assert(typeof engine.process === 'function', 'engine.process() exists');
  assert(typeof engine.state === 'object', 'engine.state exists');
  assert(engine.basalGanglia !== undefined, 'engine.basalGanglia exists');
  assert(engine.memory !== undefined, 'engine.memory exists');
  assert(engine.emotion !== undefined, 'engine.emotion exists');
  assert(engine.goals !== undefined, 'engine.goals exists');
}

// ─── RUN ───
console.log('🧠 BARREL EXPORT TESTS');
console.log('='.repeat(50));

testCoreExports();
testTypeExports();
testBrainEngineInstantiation();

console.log(`\n${'='.repeat(50)}`);
console.log(`Index: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All barrel export tests passed! ✅');
