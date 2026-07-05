// Test: Persistence v2 — SQLite 持久化 (§2.2, §2.4, §3)
// arXiv 2504.01990v2: 记忆/偏好/权重必须跨 session 持久

import { Persistence } from '../src/core/persistence';
import { unlinkSync } from 'fs';

const DB = './test-v2.db';
try { unlinkSync(DB); } catch {}

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

// ─── Test: Episodic Memory (§2.2.3) ───
{
  const p = new Persistence(DB);
  p.saveEpisodic('ep-1', 'User prefers TypeScript over Python', 0.9, ['preference', 'language']);
  p.saveEpisodic('ep-2', 'Project uses React with Vite', 0.6, ['tech-stack']);
  const results = p.retrieveEpisodic('TypeScript');
  assert(results.length >= 1, 'retrieves episodic by content');
  assert(results[0].importance === 0.9, 'importance preserved');
  p.close();
}

// ─── Test: Persistence across restart ───
{
  const p = new Persistence(DB);
  assert(p.stats().episodic >= 2, 'episodic survives restart');
  p.close();
}

// ─── Test: Semantic Memory (§2.2.3) ───
{
  const p = new Persistence(DB);
  p.saveSemantic('typescript', 'TypeScript is a typed superset of JavaScript', 0.9);
  const ts = p.retrieveSemantic('typescript');
  assert(ts !== null, 'semantic retrieval works');
  assert(ts.confidence >= 0.5, 'confidence set');
  p.close();
}

// ─── Test: SOP/Procedural Memory (§2.2.3) ───
{
  const p = new Persistence(DB);
  p.saveSOP('sop-git', 'git push', ['git add', 'git commit', 'git push'], 'git workflow');
  const match = p.matchSOP('I need to git push my changes');
  assert(match !== null, 'SOP matching by trigger');
  assert(JSON.parse(match.steps).length === 3, 'steps stored as JSON');
  p.close();
}

// ─── Test: Preferences (§2.4) ───
{
  const p = new Persistence(DB);
  p.recordPreference('verbosity', 0.9);
  p.recordPreference('verbosity', 0.7); // should average
  const prefs = p.getPreferences();
  assert(prefs.verbosity !== undefined, 'preferences stored');
  assert(prefs.verbosity < 0.9, 'rolling average works');
  p.close();
}

// ─── Test: Signal Weights (§3) ───
{
  const p = new Persistence(DB);
  p.saveSignalWeights('perceive', 5, { decay: 0.15, base: 1.0 });
  p.saveSignalWeights('emotion', 4, { intensity_mult: 0.5 });
  const w = p.getSignalWeights();
  assert(w.perceive !== undefined, 'signal weights stored');
  assert(w.perceive.priority === 5, 'priority preserved');
  assert(w.emotion !== undefined, 'multiple signals stored');
  p.close();
}

// ─── Test: micro-gate (MemCtrl) ───
{
  const p = new Persistence(DB);
  p.saveEpisodic('mu-test-1', 'Important high-score memory', 0.9, ['important']);
  p.saveEpisodic('mu-test-2', 'Trivial low-score old memory', 0.1, ['trivial']);
  const gate1 = p.muGate('mu-test-1', 'episodic');
  assert(gate1 === 'RETAIN', 'high-importance memory retained');
  p.close();
}

// ─── Test: Prune forgotten ───
{
  const p = new Persistence(DB);
  const result = p.pruneForgotten();
  assert(result.discarded >= 0, 'prune runs without error');
  p.close();
}

// ─── Cleanup ───
try { unlinkSync(DB); } catch {}
try { unlinkSync(DB + '-wal'); } catch {}
try { unlinkSync(DB + '-shm'); } catch {}

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All persistence tests passed! ✅');
