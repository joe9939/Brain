// z2-trace-normal-conversation.test.js — Normal conversation loop trace
module.exports = {
  name: 'TRACE: normal conversation',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'trace-norm-' + Date.now();
    const log = [];
    function snap(label) {
      const s = hooks.getMentalState(sid);
      const sig = hooks.getStrongestSignal(sid);
      log.push(`[${label}]  cycle=${s.cycle} L1=${s.l1.size}/5 mode=${s.M_emo.mode}@${s.M_emo.intensity.toFixed(1)} reward=${s.M_rew.score.toFixed(1)} goals=${s.M_goal.completed} swarm=${s.swarm}`);
      if (sig.length > 0) log.push(`  → SIGNAL: ${sig[0].content.slice(8, 70)}...`);
    }
    function l1complete(mode, score) {
      for (const a of ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety']) {
        hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode, score}));
      }
    }

    // Scenario 1: Normal greeting → perceive wins → 5 L1 agents dispatched
    hooks.onMessage(sid, 'hello world');
    snap('Message: hello world');
    log.push('  ↓ Expect: perceive wins (L1 empty)');

    l1complete('NORMAL', 7);
    snap('L1 complete');
    log.push('  ↓ Expect: L1 complete, signal switches');

    // Tool call
    hooks.onToolAfter(sid, 'bash', {}, 'done');
    snap('Tool returned');

    // Scenario 2: Urgent message → emotion wins
    hooks.onMessage(sid, 'URGENT security breach detected');
    snap('Message: URGENT');
    log.push('  ↓ Expect: emotion/safety wins (URGENT)');

    l1complete('URGENT', 5);
    snap('L1 URGENT complete');

    // Scenario 3: Complete task
    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    snap('Task complete');

    const events = hooks.BrainTracer.export(sid);
    log.push(`\n=== Final state ===`);
    log.push(`Cycles: ${hooks.getMentalState(sid).cycle}  Goals: ${hooks.getMentalState(sid).M_goal.completed}`);
    log.push(`BrainTracer events: ${events.length}  Types: ${[...new Set(events.map(e=>e.event))].join(', ')}`);

    const passed = hooks.getMentalState(sid).cycle >= 2 && hooks.getMentalState(sid).M_goal.completed >= 1;
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
