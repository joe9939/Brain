module.exports = {
  name: 'PATHWAY: emotion mood',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const sid = 'p3-' + Date.now();
    const log = [];

    hooks.onMessage(sid, 'hello');
    log.push(`INITIAL: mode=${hooks.getMentalState(sid).M_emo.mode}`);

    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"CAUTION","confidence":0.9,"valence":-0.5,"arousal":0.8}');
    log.push(`AMYGDALA: mode=${hooks.getMentalState(sid).M_emo.mode} confidence=${hooks.getMentalState(sid).M_emo.intensity}`);

    const passed = hooks.getMentalState(sid).M_emo.mode === 'CAUTION';
    return { passed, message: log.join('\n'), time_ms: 0 };
  },
};
