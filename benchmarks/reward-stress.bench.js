// reward-stress.bench.js — 1K actions stress test
const N = 1000;

function ucbScore(n, totalN) {
  if (n < 5) return 3;
  return Math.min(Math.sqrt(2 * Math.log(totalN) / n), 3);
}

function tdUpdate(current, reward, next) {
  const target = reward + (next ? 0.9 * next : 0);
  return Math.max(0, Math.min(10, current + 0.1 * (target - current)));
}

const start = Date.now();
const actions = [];

for (let i = 0; i < N; i++) {
  actions.push({
    id: `action_${i}`,
    type: ['read', 'write', 'edit', 'delete', 'bash', 'task', 'question'][i % 7],
    target: `/path/to/file_${Math.floor(i / 10)}.ts`,
    success: i % 4 !== 0,
    timeSpent: 50 + Math.floor(Math.random() * 950),
    level: ['atomic', 'step', 'task'][i % 3],
  });
}

const t1 = Date.now();

let totalValue = 5;
const actionCounts = {};
for (const a of actions) {
  actionCounts[a.type] = (actionCounts[a.type] || 0) + 1;
  totalValue = tdUpdate(totalValue, a.success ? 8 : 2, totalValue);
}

const finalValue = totalValue;
const t2 = Date.now();

function computeIntrinsic(actions) {
  const seenTypes = new Set();
  let improve = 0;
  let pairs = 0;
  for (const a of actions) {
    seenTypes.add(a.type);
    if (a.success) improve++;
  }
  pairs = Object.keys(actionCounts).length;
  return Math.min(4, ((seenTypes.size < 3 ? 1 : 0.2) * 0.4 + (improve > 0 ? 1 : 0.3) * 0.3 + (pairs > 5 ? 1 : 0.4) * 0.3) * 3);
}

const intrinsic = computeIntrinsic(actions);
const t3 = Date.now();

console.log(JSON.stringify({
  name: 'reward-stress',
  metrics: {
    actions: N,
    action_types: Object.keys(actionCounts).length,
    type_distribution: actionCounts,
    td_value: Math.round(finalValue * 100) / 100,
    intrinsic_curiosity: Math.round(intrinsic * 100) / 100,
    parse_time_ms: t1 - start,
    td_update_time_ms: t2 - t1,
    intrinsic_time_ms: t3 - t2,
    total_time_ms: t3 - start,
  },
  pass: (t3 - start) < 2000,
  message: `${N} actions scored via TD(${Math.round(finalValue * 10) / 10}) + intrinsic(${Math.round(intrinsic * 10) / 10}) in ${t3 - start}ms`,
}));
