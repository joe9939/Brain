// z3-trace-complex-task.test.js — Complex task trace (swarm + action signal)
module.exports = {
  name: 'TRACE: complex task swarm',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'trace-cplx-' + Date.now();
    const log = [];
    function snap(label) {
      const s = hooks.getMentalState(sid);
      log.push(`[${label}]  cycle=${s.cycle} L1=${s.l1.size}/5 swarm=${s.swarm} reward=${s.M_rew.score.toFixed(1)} goals=${s.M_goal.completed}`);
    }

    // Complex task (>15 words + implement) → swarm=true → action signal
    hooks.onMessage(sid, 'implement complex microservice architecture kubernetes deployment monitoring stack alerting logging and healthcheck dashboard configuration');
    snap('Complex task message');
    log.push(`  ↓ Expect: swarm=true (complex task >` + `15 words)`);

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:8}));
    }
    snap('L1 complete');
    log.push(`  ↓ Expect: action signal (swarm=true)`);

    // Low score task → reward signal
    hooks.onMessage(sid, 'check this code for bugs');
    hooks.getStrongestSignal(sid); // consume perceive
    snap('New message: code review');
    log.push(`  ↓ Expect: reward signal (low score)`);

    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:2}));
    }
    snap('L1 complete score=2');
    log.push(`  ↓ Expect: reward signal (score=2<3)`);

    hooks.onToolAfter(sid, 'bash', {}, '{"score":1}');
    snap('score updated to 1');

    const events = hooks.BrainTracer.export(sid);
    log.push(`\n=== Final ===`);
    log.push(`Cycles: ${hooks.getMentalState(sid).cycle}  Goals: ${hooks.getMentalState(sid).M_goal.completed}`);

    const s = hooks.getMentalState(sid);
    const passed = s.cycle >= 2 && s.M_rew.score <= 2;
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
