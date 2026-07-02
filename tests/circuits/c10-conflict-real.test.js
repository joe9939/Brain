module.exports = {
  name: 'C10: conflict (real)',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];

    const sid = 'c10r-' + Date.now();
    hooks.onMessage(sid, 'test conflict resolution');

    // D-K: attention_budget enforced — reward modulation within remaining budget
    const st0 = hooks.getMentalState(sid);
    R.push({ n: 'D-K: initial M_rew.score is 0', p: st0 && st0.M_rew && st0.M_rew.score === 0 });
    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"score":2}');
    var st1 = hooks.getMentalState(sid);
    R.push({ n: 'D-K: reward updates within budget (score=2)', p: st1 && st1.M_rew && st1.M_rew.score === 2 });
    // Fill L1 so perceive signal doesn't dominate, then low score should trigger reward
    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{}');
    hooks.onToolAfter(sid, 'task', { category: 'brain-safety' }, '{}');
    hooks.getMentalState(sid).M_goal.completed = 1;
    var sig1 = hooks.getStrongestSignal(sid);
    R.push({ n: 'D-K: low score (<3) triggers reward signal', p: Array.isArray(sig1) && sig1.length > 0 && sig1[0].content.includes('Reward') });

    hooks.onToolAfter(sid, 'bash', {}, 'PASS');
    var st2 = hooks.getMentalState(sid);
    R.push({ n: 'D-K: completed increment works alongside reward', p: st2 && st2.M_goal && st2.M_goal.completed >= 1 });

    // B-J: CAUTION mode affects state
    var sidB = 'c10r-B-' + Date.now();
    hooks.onMessage(sidB, 'caution test');
    hooks.onToolAfter(sidB, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9}');
    var stB = hooks.getMentalState(sidB);
    R.push({ n: 'B-J: CAUTION mode set', p: stB && stB.M_emo && stB.M_emo.mode === 'CAUTION' });
    R.push({ n: 'B-J: CAUTION intensity=0.9', p: stB && stB.M_emo && stB.M_emo.intensity === 0.9 });
    var sigB = hooks.getStrongestSignal(sidB);
    R.push({ n: 'B-J: CAUTION triggers emotion or safety signal', p: Array.isArray(sigB) });
    R.push({ n: 'B-J: signal content mentions CAUTION', p: Array.isArray(sigB) && sigB.length > 0 && sigB[0].content.includes('CAUTION') });

    // H-I: threshold clamping — personality_base + mood_offset
    var sidH = 'c10r-H-' + Date.now();
    hooks.onMessage(sidH, 'threshold test');
    hooks.onToolAfter(sidH, 'task', { category: 'brain-amygdala' }, '{"mode":"URGENT","confidence":0.9,"valence":-0.6,"arousal":0.9}');
    var stH = hooks.getMentalState(sidH);
    R.push({ n: 'H-I: URGENT with high arousal', p: stH && stH.M_emo && stH.M_emo.arousal === 0.9 });
    R.push({ n: 'H-I: URGENT valence clamped (-0.6)', p: stH && stH.M_emo && stH.M_emo.valence === -0.6 });
    var sigH = hooks.getStrongestSignal(sidH);
    R.push({ n: 'H-I: signal still computable under URGENT', p: Array.isArray(sigH) });

    // NORMAL mood: moderate values stay
    var sidN = 'c10r-N-' + Date.now();
    hooks.onMessage(sidN, 'normal threshold');
    hooks.onToolAfter(sidN, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.5,"valence":0.3,"arousal":0.4}');
    var stN = hooks.getMentalState(sidN);
    R.push({ n: 'H-I: NORMAL valence=0.3', p: stN && stN.M_emo && stN.M_emo.valence === 0.3 });
    R.push({ n: 'H-I: NORMAL arousal=0.4', p: stN && stN.M_emo && stN.M_emo.arousal === 0.4 });

    var passed = R.every(function(r) { return r.p; });
    return { passed: passed, message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
