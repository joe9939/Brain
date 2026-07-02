// z3-trace-complex-task.test.js — 复杂任务追踪 (swarm + action信号)
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

    // 复杂任务（>15words + implement）→ swarm=true → action信号
    hooks.onMessage(sid, 'implement complex microservice architecture kubernetes deployment monitoring stack alerting logging and healthcheck dashboard configuration');
    snap('复杂任务消息');
    log.push(`  ↓ 预期: swarm=true (复杂任务>` + `15词)`);

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:8}));
    }
    snap('L1完成');
    log.push(`  ↓ 预期: action信号 (swarm=true)`);

    // 低分数任务 → reward信号
    hooks.onMessage(sid, 'check this code for bugs');
    hooks.getStrongestSignal(sid); // consume perceive
    snap('新消息: code review');
    log.push(`  ↓ 预期: reward信号 (score低)`);

    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:2}));
    }
    snap('L1完成 score=2');
    log.push(`  ↓ 预期: reward信号 (score=2<3)`);

    hooks.onToolAfter(sid, 'bash', {}, '{"score":1}');
    snap('score更新为1');

    const events = hooks.BrainTracer.export(sid);
    log.push(`\n=== 最终 ===`);
    log.push(`周期: ${hooks.getMentalState(sid).cycle}  目标: ${hooks.getMentalState(sid).M_goal.completed}`);

    const s = hooks.getMentalState(sid);
    const passed = s.cycle >= 2 && s.M_rew.score <= 2;
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
