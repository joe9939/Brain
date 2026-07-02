module.exports = {
  name: 'C13: agentest (real)',
  run: async () => {
    const path = require('path');
    const url = require('url');
    const handlerPath = url.pathToFileURL(path.join(__dirname, '..', 'agentest-handler.mjs')).href;
    const mod = await import(handlerPath);
    const handler = mod.handler;
    const R = [];

    // 1. Handler returns {mechanisms, response}
    var r1 = handler('c13r-s1', { text: 'implement login feature with tests' });
    R.push({ n: 'returns object', p: r1 && typeof r1 === 'object' });
    R.push({ n: 'has mechanisms', p: r1 && r1.mechanisms && typeof r1.mechanisms === 'object' });
    R.push({ n: 'has response', p: r1 && typeof r1.response === 'string' });
    R.push({ n: 'response not empty', p: r1 && r1.response.length > 0 });
    R.push({ n: 'response mentions L1', p: r1 && r1.response.includes('L1') });

    // 2. mechanisms has signals, mood, reward, gates
    var m = r1 && r1.mechanisms;
    R.push({ n: 'mechanisms.signals.winner', p: m && m.signals && typeof m.signals.winner === 'string' });
    R.push({ n: 'mechanisms.signals.strength', p: m && m.signals && typeof m.signals.strength === 'number' });
    R.push({ n: 'mechanisms.signals.top3', p: m && m.signals && typeof m.signals.top3 === 'string' });
    R.push({ n: 'mechanisms.mood.mode', p: m && m.mood && typeof m.mood.mode === 'string' });
    R.push({ n: 'mechanisms.mood.intensity', p: m && m.mood && typeof m.mood.intensity === 'number' });
    R.push({ n: 'mechanisms.reward.score', p: m && m.reward && typeof m.reward.score === 'number' });
    R.push({ n: 'mechanisms.reward.total', p: m && m.reward && typeof m.reward.total === 'number' });
    R.push({ n: 'mechanisms.gates array', p: m && Array.isArray(m.gates) });
    R.push({ n: 'mechanisms.gates length 7', p: m && m.gates.length === 7 });
    R.push({ n: 'mechanisms.gates[0].id', p: m && m.gates[0] && typeof m.gates[0].id === 'string' });

    // 3. L1 agents all complete (l1 === 5)
    R.push({ n: 'l1_completed === 5', p: m && m.l1_completed === 5 });

    // 4. Empty text handled gracefully
    var rEmpty = handler('c13r-s2', { text: '' });
    R.push({ n: 'empty text — returns object', p: rEmpty && typeof rEmpty === 'object' });
    R.push({ n: 'empty text — has mechanisms', p: rEmpty && rEmpty.mechanisms && typeof rEmpty.mechanisms.signals === 'object' });
    R.push({ n: 'empty text — l1 completed', p: rEmpty && rEmpty.mechanisms && rEmpty.mechanisms.l1_completed === 5 });
    R.push({ n: 'empty text — has gates', p: rEmpty && Array.isArray(rEmpty.mechanisms.gates) && rEmpty.mechanisms.gates.length === 7 });

    // 5. Null/undefined text handled
    var rNull = handler('c13r-s3', { text: null });
    R.push({ n: 'null text — returns object', p: rNull && typeof rNull === 'object' });
    R.push({ n: 'null text — has mechanisms', p: rNull && rNull.mechanisms && typeof rNull.mechanisms.signals === 'object' });
    R.push({ n: 'null text — l1 completed', p: rNull && rNull.mechanisms && rNull.mechanisms.l1_completed === 5 });

    var rUndef = handler('c13r-s4', {});
    R.push({ n: 'undefined text — returns object', p: rUndef && typeof rUndef === 'object' });
    R.push({ n: 'undefined text — has mechanisms', p: rUndef && rUndef.mechanisms && typeof rUndef.mechanisms.signals === 'object' });
    R.push({ n: 'undefined text — l1 completed', p: rUndef && rUndef.mechanisms && rUndef.mechanisms.l1_completed === 5 });

    return { passed: R.every(function(r) { return r.p; }), message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
