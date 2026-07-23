// DeathImpact — 死亡影响系统 (巴甫洛夫条件反射 + 情境恐惧)
// TDD: 死亡 → 情境恐惧记忆 → 泛化 → 消退 → 敏化

import { DeathImpact } from '../src/core/death-impact.js';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ── 记录死亡 ──

console.log('\n🧪 DeathImpact: record death');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 10, y: 64, z: 20 }, 'suffocation');
  const count = di.getDeathCount();
  assert(count === 1, 'death count is 1 after one death');
}

// ── 死亡位置附近 L2 升高 ──

console.log('\n🧪 DeathImpact: fear at death location');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  
  // 在死亡位置 → fear should be high
  const fearAtDeath = di.getFearAt({ x: 0, y: 64, z: 0 });
  assert(fearAtDeath > 0.5, 'high fear at exact death location');
  
  // 远离死亡位置 → fear should be low
  const fearFar = di.getFearAt({ x: 100, y: 64, z: 100 });
  assert(fearFar < 0.1, 'low fear far from death location');
}

// ── 泛化: 相似位置也有恐惧但较弱 ──

console.log('\n🧪 DeathImpact: generalization gradient');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  
  const at10 = di.getFearAt({ x: 10, y: 64, z: 0 });
  const at20 = di.getFearAt({ x: 20, y: 64, z: 0 });
  assert(at10 > at20, 'fear decreases with distance from death location');
}

// ── 消退: 安全存活后恐惧下降 ──

console.log('\n🧪 DeathImpact: extinction over time');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  
  const before = di.getFearAt({ x: 0, y: 64, z: 0 });
  
  // Simulate safe time passing
  di.tick(100);  // 100 safe ticks
  di.tick(100);  // another 100

  const after = di.getFearAt({ x: 0, y: 64, z: 0 });
  assert(after < before, 'fear decreases after safe time');
}

// ── 敏化: 多死几次恐惧叠加 ──

console.log('\n🧪 DeathImpact: sensitization');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  const after1 = di.getFearAt({ x: 0, y: 64, z: 0 });
  
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  const after2 = di.getFearAt({ x: 0, y: 64, z: 0 });
  
  assert(after2 > after1, 'fear higher after second death');
}

// ── 死因类型影响恐惧类型 ──

console.log('\n🧪 DeathImpact: cause-specific fear');
{
  const di = new DeathImpact();
  di.recordDeath({ x: 0, y: 64, z: 0 }, 'suffocation');
  
  // Suffocation death → fear when near walls/low ceilings
  const suffFear = di.getCauseFear('suffocation');
  assert(suffFear > 0.3, 'suffocation death creates suffocation fear');
}

// ── Summary ──

console.log(`\n==================================================`);
console.log(`DeathImpact: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All DeathImpact tests passed! 💀✅');
