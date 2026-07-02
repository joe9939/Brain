// z1-full-session-trace.test.js — 完整会话追踪：从消息到最终状态，记录中间所有活动
// 测试"发消息 → 信号竞争 → L1派出 → 状态变更 → 信号切换"的完整链路

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

    // Step 1: 用户发消息
    hooks.onMessage(sid, 'implement a complex microservice architecture with kubernetes deployment monitoring stack alerting logging and healthcheck');
    snap('STEP1: 收到消息');
    const s1 = hooks.getMentalState(sid);
    log.push(`  CYCLES: ${s1.cycle}  swarm=${s1.swarm}  l1.size=${s1.l1.size}`);

    // Step 2: 模拟5个L1 agent逐一完成
    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:5}));
    }
    snap('STEP2: L1 5/5 complete');
    log.push(`  L1_SET: ${Array.from(hooks.getMentalState(sid).l1).join(', ')}`);

    // Step 3: 信号竞争——第一个信号会被dedup吃掉，第二次调用得到空
    const sigAfter = hooks.getStrongestSignal(sid);
    log.push(`  SIGNAL_AFTER_L1: ${sigAfter.length > 0 ? 'winner=' + (sigAfter[0]?.content?.slice(8, 50) || '?') : '(dedup - same winner)'}`);

    // Step 4: 任务完成 → 增长goal
    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    snap('STEP3: PASS completed');
    log.push(`  TD_ERROR: ${hooks.getMentalState(sid).td_error.toFixed(2)}`);

    // Step 5: CAUTION 模式
    hooks.onMessage(sid, 'urgent security issue detected');
    snap('STEP4: 紧急消息');
    log.push(`  FRESH_CYCLE: cycle=${hooks.getMentalState(sid).cycle}`);

    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'CAUTION',confidence:0.9,score:2}));
    }
    snap('STEP5: L1 CAUTION');
    log.push(`  EMOTION_STRENGTH: mode=${hooks.getMentalState(sid).M_emo.mode} intensity=${hooks.getMentalState(sid).M_emo.intensity}`);

    // Step 6: 低分数 → reward signal
    hooks.onToolAfter(sid, 'bash', {}, '{"score":2}');
    log.push(`  AFTER_LOW_SCORE: reward.score=${hooks.getMentalState(sid).M_rew.score.toFixed(1)}`);

    // Step 7: BrainTracer 记录追踪
    const events = hooks.BrainTracer.export(sid);
    log.push(`  TRACER: ${events.length} total events`);
    const eventTypes = [...new Set(events.map(e => e.event))];
    log.push(`  EVENTS: ${eventTypes.join(', ')}`);
    const t1blocks = events.filter(e => e.event === 'T1:before' && e.data?.blocked);
    log.push(`  G1_BLOCKS: ${t1blocks.length}`);

    // 验证关键通路
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
