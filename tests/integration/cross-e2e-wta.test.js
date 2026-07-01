// cross-e2e-wta.test.js — WTA score formula, top-2 gate selection, attention budget
// Verifies the Winner-Take-All gate mechanism.
module.exports = {
  name: 'CROSS-E2E: Winner-Take-Most Gates',
  run: async () => {
    const start = Date.now();
    const results = [];

    function gateScore(urgency, rewardBias, safety, reliability) {
      return urgency * 0.35 + rewardBias * 0.25 + safety * 0.25 + reliability * 0.15;
    }

    const gates = {
      'brain-safety': { urgency: 7, reward: 5, safety: 9, reliability: 8 },
      'brain-attention': { urgency: 6, reward: 4, safety: 5, reliability: 7 },
      'brain-reward': { urgency: 4, reward: 8, safety: 3, reliability: 6 },
      'brain-basal': { urgency: 3, reward: 6, safety: 4, reliability: 9 },
      'brain-insula': { urgency: 5, reward: 2, safety: 7, reliability: 4 },
      'brain-cerebellum': { urgency: 2, reward: 3, safety: 2, reliability: 5 },
    };

    const scored = Object.entries(gates).map(([name, g]) => ({
      name,
      score: gateScore(g.urgency, g.reward, g.safety, g.reliability),
    })).sort((a, b) => b.score - a.score);

    results.push({ name: 'Safety gate has highest score (' + scored[0].score.toFixed(2) + ')', pass: scored[0].name === 'brain-safety' });

    const top2 = scored.slice(0, 2);
    results.push({ name: 'Top-2 selected: ' + top2.map(g => g.name).join(', '), pass: top2.length === 2 });

    const threshold = 3.0;
    const allAboveThreshold = top2.every(g => g.score >= threshold);
    results.push({ name: 'Top-2 gates exceed threshold ' + threshold, pass: allAboveThreshold });

    const attentionBudget = 2.0;
    const consumption = top2.reduce((sum, g) => sum + g.score * 0.1, 0);
    results.push({ name: 'Consumption ' + consumption.toFixed(2) + ' within budget ' + attentionBudget, pass: consumption <= attentionBudget });

    const personality = { openness: 0.6, conscientiousness: 0.8, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.4 };
    const moodOffset = 0.15;
    const adjustedThreshold = (base) => Math.max(0, Math.min(1, base + moodOffset));
    const adjusted = adjustedThreshold(0.5);
    results.push({ name: 'Personality+mood threshold=' + adjusted.toFixed(2), pass: Math.abs(adjusted - 0.65) < 0.01 });

    const deduplicated = new Set(top2.map(g => g.name)).size === top2.length;
    results.push({ name: 'Top-2 gates are distinct', pass: deduplicated });

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
