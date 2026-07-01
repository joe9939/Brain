// cross-e2e-world.test.js — world_predict → execute → world_update → world_diff verify
// Simulates the world model predict-verify loop with precision/recall tracking.
const config = require('../config');

module.exports = {
  name: 'CROSS-E2E: World Predict→Verify',
  run: async () => {
    const start = Date.now();
    const results = [];

    function bfsImpact(target, graph) {
      const visited = new Set();
      const queue = [target];
      const affected = [];
      while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);
        for (const dep of (graph[node] || [])) {
          if (!visited.has(dep)) { affected.push(dep); queue.push(dep); }
        }
      }
      return affected;
    }

    function computeDiff(predicted, actual) {
      const predictedSet = new Set(predicted);
      const actualSet = new Set(actual);
      const tp = [...predictedSet].filter(x => actualSet.has(x)).length;
      const fp = predictedSet.size - tp;
      const fn = actualSet.size - tp;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
      const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      return { precision: Math.round(precision * 100) / 100, recall: Math.round(recall * 100) / 100, f1: Math.round(f1 * 100) / 100, tp, fp, fn };
    }

    const graph = {
      'src/main.ts': ['src/utils.ts', 'src/config.ts'],
      'src/utils.ts': ['src/helper.ts'],
      'src/config.ts': ['src/constants.ts'],
      'src/helper.ts': [],
      'src/constants.ts': [],
    };

    const predicted = bfsImpact('src/main.ts', graph);
    results.push({ name: 'BFS predicts 4 affected files', pass: predicted.length === 4 });

    const actual = ['src/utils.ts', 'src/config.ts', 'src/helper.ts', 'src/constants.ts'];
    const diff1 = computeDiff(predicted, actual);
    results.push({ name: 'Perfect prediction: precision=1.0', pass: diff1.precision === 1.0 });
    results.push({ name: 'Perfect prediction: recall=1.0', pass: diff1.recall === 1.0 });
    results.push({ name: 'Perfect prediction: f1=1.0', pass: diff1.f1 === 1.0 });

    const overPredicted = ['src/utils.ts', 'src/config.ts', 'src/helper.ts', 'src/constants.ts', 'src/extra.ts'];
    const diff2 = computeDiff(overPredicted, actual);
    results.push({ name: 'Overprediction reduces precision', pass: diff2.precision < 1.0 && diff2.recall === 1.0 });

    const underPredicted = ['src/utils.ts', 'src/config.ts'];
    const diff3 = computeDiff(underPredicted, actual);
    results.push({ name: 'Underprediction reduces recall', pass: diff3.recall < 1.0 && diff3.precision === 1.0 });

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
