module.exports = {
  name: 'BEHAVIORAL: safety gates',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    const sid = 'bg-' + Date.now();
    try { hooks.onToolBefore(sid, 'bash', {command: 'rm -rf /'}); R.push({n:'G1 block throw', p: false}); }
    catch(e) { R.push({n:'G1 block throw', p: e.message.includes('G1')}); }
    hooks.onToolBefore(sid, 'bash', {command: 'echo safe'});
    R.push({n:'safe cmd passes', p: true});
    return {passed: R.every(r=>r.p), message: R.map(r=>(r.p?'PASS':'FAIL')+' '+r.n).join('\n'), time_ms: 0};
  },
};
