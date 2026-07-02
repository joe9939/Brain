// z2-trace-normal-conversation.test.js — 普通对话回路追踪
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

    // 场景1：普通问候 → perceive 胜出 → 5个L1派出
    hooks.onMessage(sid, 'hello world');
    snap('消息: hello world');
    log.push('  ↓ 预期: perceive 胜出 (L1为空)');

    l1complete('NORMAL', 7);
    snap('L1完成');
    log.push('  ↓ 预期: L1完成，信号切换');

    // 工具调用
    hooks.onToolAfter(sid, 'bash', {}, 'done');
    snap('工具返回');

    // 场景2：紧急消息 → emotion 胜出
    hooks.onMessage(sid, 'URGENT security breach detected');
    snap('消息: URGENT');
    log.push('  ↓ 预期: emotion/safety 胜出 (URGENT)');

    l1complete('URGENT', 5);
    snap('L1 URGENT完成');

    // 场景3：完成任务
    hooks.onToolAfter(sid, 'bash', {}, 'PASS completed');
    snap('任务完成');

    const events = hooks.BrainTracer.export(sid);
    log.push(`\n=== 最终状态 ===`);
    log.push(`周期: ${hooks.getMentalState(sid).cycle}  目标: ${hooks.getMentalState(sid).M_goal.completed}`);
    log.push(`BrainTracer事件: ${events.length}  类型: ${[...new Set(events.map(e=>e.event))].join(', ')}`);

    const passed = hooks.getMentalState(sid).cycle >= 2 && hooks.getMentalState(sid).M_goal.completed >= 1;
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
