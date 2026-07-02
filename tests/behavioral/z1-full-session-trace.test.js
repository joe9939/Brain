// z1-full-session-trace.test.js — Full session trace: from message to final state, logging all intermediate activity
// Tests the full chain: message → signal competition → L1 dispatch → state change → signal switch

module.exports = {
  name: 'TRACE: full session lifecycle',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'trace-' + Date.now();
    const log = [];
    function snap(label) {
      const s = hooks.getMentalState(sid);
      const sig = hooks.getStrongestSignal(sid);
      log.push(`[${label}]`);
      log.push(`  L1:  ${s.l1.size}/5  [${Array.from(s.l1).join(', ') || 'empty'}]`);
      log.push(`  M_t: mode=${s.M_emo.mode}@${s.M_emo.intensity.toFixed(1)} reward=${s.M_rew.score.toFixed(1)} goals=${s.M_goal.completed} swarm=${s.swarm}`);
      log.push(`  SIG: ${sig.length > 0 ? sig[0].content.slice(8, 60) + '...' : '(dedup/none)'}`);
      return s;
    }

    // Step 1: User sends message
    hooks.onMessage(sid, 'implement a complex microservice architecture with kubernetes deployment monitoring stack alerting logging and healthcheck');
    snap('STEP1: Message received');
    const s1 = hooks.getMentalState(sid);
    log.push(`  CYCLES: ${s1.cycle}  swarm=${s1.swarm}  l1.size=${s1.l1.size}`);

    // Step 2: Simulate 5 L1 agents completing one by one
    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:5}));
    }
    snap('STEP2: L1 5/5 complete');
    log.push(`  L1_SET: ${Array.from(hooks.getMentalState(sid).l1).join(', ')}`);

    // Step 3: Signal competition — first signal consumed by dedup, second call returns empty
    const sigAfter = hooks.getStrongestSignal(sid);
    log.push(`  SIGNAL_AFTER_L1: ${sigAfter.length > 0 ? 'winner=' + (sigAfter[0]?.content?.slice(8, 50) || '?') : '(dedup - same winner)'}`);

    // Step 4: Task complete → increment goal
    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    snap('STEP3: PASS completed');
    log.push(`  TD_ERROR: ${hooks.getMentalState(sid).td_error.toFixed(2)}`);

    // Step 5: CAUTION mode
    hooks.onMessage(sid, 'urgent security issue detected');
    snap('STEP4: Urgent message');
    log.push(`  FRESH_CYCLE: cycle=${hooks.getMentalState(sid).cycle}`);

    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'CAUTION',confidence:0.9,score:2}));
    }
    snap('STEP5: L1 CAUTION');
    log.push(`  EMOTION_STRENGTH: mode=${hooks.getMentalState(sid).M_emo.mode} intensity=${hooks.getMentalState(sid).M_emo.intensity}`);

    // Step 6: Low score → reward signal
    hooks.onToolAfter(sid, 'bash', {}, '{"score":2}');
    log.push(`  AFTER_LOW_SCORE: reward.score=${hooks.getMentalState(sid).M_rew.score.toFixed(1)}`);

    // Step 7: BrainTracer records trace
    const events = hooks.BrainTracer.export(sid);
    log.push(`  TRACER: ${events.length} total events`);
    const eventTypes = [...new Set(events.map(e => e.event))];
    log.push(`  EVENTS: ${eventTypes.join(', ')}`);
    const t1blocks = events.filter(e => e.event === 'T1:before' && e.data?.blocked);
    log.push(`  G1_BLOCKS: ${t1blocks.length}`);

    // Verify critical path
    const finalState = hooks.getMentalState(sid);
    const passed = (
      finalState.cycle >= 2 &&
      finalState.M_goal.completed >= 1 &&
      finalState.l1.size >= 5 &&
      events.length >= 10
    );

    log.push(`\n=== VERDICT: ${passed ? 'PASS' : 'FAIL'} ===`);
    log.push(`Cycles: ${finalState.cycle}  Goals: ${finalState.M_goal.completed}  L1: ${finalState.l1.size}  Events: ${events.length}`);

    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
