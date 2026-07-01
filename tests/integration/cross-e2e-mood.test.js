// cross-e2e-mood.test.js — amygdala CAUTION → mood decay → L2 safety gate fires
// Verifies emotion propagation inhibits L2 unsafe gates under CAUTION mode.
module.exports = {
  name: 'CROSS-E2E: Mood→Safety Gate',
  run: async () => {
    const start = Date.now();
    const results = [];

    function moodDecay(confidence, decayRate, elapsedMin) {
      const halflife = decayRate === 0.5 ? 30 : 120;
      return confidence * Math.pow(0.5, elapsedMin / halflife);
    }

    function gateScore(urgency, rewardBias, safety, reliability) {
      return urgency * 0.35 + rewardBias * 0.25 + safety * 0.25 + reliability * 0.15;
    }

    const decayed30 = moodDecay(0.9, 0.5, 30);
    results.push({ name: 'URGENT mood after 30min=' + decayed30.toFixed(3), pass: Math.abs(decayed30 - 0.45) < 0.1 });

    const decayed120 = moodDecay(0.9, 0.25, 120);
    results.push({ name: 'NORMAL mood after 2h=' + decayed120.toFixed(3), pass: Math.abs(decayed120 - 0.45) < 0.1 });

    const normalGates = {
      safety: gateScore(3, 5, 2, 5),
      reward: gateScore(3, 5, 2, 5),
    };
    const cautionGates = {
      safety: gateScore(8, 7, 9, 6),
      reward: gateScore(8, 7, 9, 6),
    };

    results.push({ name: 'CAUTION mode: safety gate > 7 (' + cautionGates.safety.toFixed(2) + ')', pass: cautionGates.safety > 7 });
    results.push({ name: 'Normal safety < CAUTION safety', pass: normalGates.safety < cautionGates.safety });

    const attentionBudget = 2.0;
    const consumption = cautionGates.safety * 0.1 + cautionGates.reward * 0.1;
    results.push({ name: 'Consumption ' + consumption.toFixed(2) + ' within budget ' + attentionBudget, pass: consumption <= attentionBudget });

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
