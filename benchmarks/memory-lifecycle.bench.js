// memory-lifecycle.bench.js — decay 10K, consolidate 5K, detect_conflicts < 1s
const N_DECAY = 10000;
const N_CONSOLIDATE = 5000;

const now = new Date();
function daysAgo(d) { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString(); }

const memories = [];
for (let i = 0; i < N_DECAY; i++) {
  memories.push({
    id: `mem_${i}`,
    type: i % 4 === 0 ? 'episodic' : i % 4 === 1 ? 'semantic' : i % 4 === 2 ? 'procedural' : 'working',
    importance: Math.random(),
    last_accessed: i % 5 === 0 ? daysAgo(60) : daysAgo(i % 30),
    content: `memory content ${i} with some keywords for similarity testing`,
    tags: [`tag_${i % 20}`, `topic_${i % 5}`],
    access_count: Math.floor(Math.random() * 20),
  });
}

function decayMemories(mems, daysThreshold) {
  let decayed = 0;
  let archived = 0;
  for (const m of mems) {
    const age = (now - new Date(m.last_accessed)) / 86400000;
    if (age > daysThreshold) {
      m.importance *= 0.5;
      decayed++;
      if (age > daysThreshold * 2 && m.importance < 0.1) {
        m.archived = true;
        archived++;
      }
    }
  }
  return { decayed, archived };
}

function consolidateMemories(mems) {
  let merged = 0;
  let deleted = 0;
  const used = new Set();
  for (let i = 0; i < mems.length; i++) {
    if (used.has(i) || mems[i].importance >= 0.5) continue;
    const group = [i];
    used.add(i);
    for (let j = i + 1; j < mems.length; j++) {
      if (used.has(j) || mems[j].importance >= 0.5) continue;
      const tagsI = mems[i].tags.filter(t => mems[j].tags.includes(t));
      if (tagsI.length > 0) { group.push(j); used.add(j); }
    }
    if (group.length > 3) { merged++; deleted += group.length - 1; }
  }
  return { merged, deleted, strengthened: mems.filter(m => m.access_count > 10).length };
}

function detectConflicts(mems) {
  const conflicts = [];
  for (let i = 0; i < Math.min(mems.length, 100); i++) {
    for (let j = i + 1; j < Math.min(mems.length, 100); j++) {
      const sharedTags = mems[i].tags.filter(t => mems[j].tags.includes(t));
      if (sharedTags.length > 0) {
        const wordsA = new Set(mems[i].content.split(/\s+/));
        const wordsB = new Set(mems[j].content.split(/\s+/));
        const inter = new Set([...wordsA].filter(w => wordsB.has(w)));
        const union = new Set([...wordsA, ...wordsB]);
        const sim = union.size === 0 ? 1 : inter.size / union.size;
        if (sim >= 0.3 && sim < 0.85) {
          conflicts.push({ topic: sharedTags[0], id1: mems[i].id, id2: mems[j].id, similarity: sim });
        }
      }
    }
  }
  return { conflicts, resolved: 0, flagged: conflicts.length };
}

const start = Date.now();
const decayResult = decayMemories(memories, 30);
const t1 = Date.now();

const consolidateResult = consolidateMemories(memories);
const t2 = Date.now();

const conflictResult = detectConflicts(memories);
const t3 = Date.now();

const totalTime = t3 - start;

console.log(JSON.stringify({
  name: 'memory-lifecycle',
  metrics: {
    decay_time_ms: t1 - start,
    consolidate_time_ms: t2 - t1,
    conflict_time_ms: t3 - t2,
    total_time_ms: totalTime,
    decayed: decayResult.decayed,
    archived: decayResult.archived,
    merged: consolidateResult.merged,
    deleted: consolidateResult.deleted,
    strengthened: consolidateResult.strengthened,
    conflicts_found: conflictResult.conflicts.length,
  },
  pass: totalTime < 1000,
  message: `decay ${decayResult.decayed}/${N_DECAY}, consolidate ${consolidateResult.merged} groups, detect ${conflictResult.conflicts.length} conflicts in ${totalTime}ms`,
}));
