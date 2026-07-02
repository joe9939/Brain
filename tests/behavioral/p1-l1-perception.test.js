module.exports = {
  name: 'PATHWAY: L1 perception',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'p1-' + Date.now();
    const log = [];

    log.push('USER: hello world');
    hooks.onMessage(sid, 'hello world');

    const agents = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    for (const a of agents) {
      hooks.onToolAfter(sid, 'task', { category: a }, JSON.stringify({mode:'NORMAL',score:5}));
      const s = hooks.getMentalState(sid);
      log.push(`L1: ${a} ✓ (${s.l1.size}/5)`);
    }

    log.push(`M_t: mode=${hooks.getMentalState(sid).M_emo.mode}`);
    const events = hooks.BrainTracer.export(sid);
    log.push(`TRACER: ${events.length} events`);

    const passed = hooks.getMentalState(sid).l1.size === 5;
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
