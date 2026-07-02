// c14-scenarios.test.js - E2E scenarios: chat, routing, dark mode, install, activation, runtime, conformance
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const cfg = require('../config');

function r(n, p) { return { name: n, pass: p }; }

module.exports = {
  name: 'C14: E2E Scenarios',
  run: async () => {
    const start = Date.now();
    const results = [];
    const H = cfg.BRAIN_AGENT_DIR;

    // 1. Chat trigger: message -> onMessage -> signal
    try {
      const hooks = await import(pathToFileURL(path.join(H, 'src/plugin/brain-hooks.mjs')));
      var sid1 = 'e2e-chat-' + Date.now();
      hooks.onMessage(sid1, 'hello world');
      var st1 = hooks.getMentalState(sid1);
      results.push(r('chat: cycle after message', st1 && st1.cycle === 1));
      results.push(r('chat: l1 reset', st1 && st1.l1.size === 0));
      // Signal after L1 agents fire
      hooks.onToolAfter(sid1, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 5 }));
      hooks.onToolAfter(sid1, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', intensity: 0.2, valence: 0.3, arousal: 0.2 }));
      hooks.onToolAfter(sid1, 'task', { category: 'brain-hippocampus' }, JSON.stringify({ episodic: [], relevant_sops: [] }));
      hooks.onToolAfter(sid1, 'task', { category: 'brain-world-cortex' }, JSON.stringify({ analysis: 'test', impact: 'low' }));
      hooks.onToolAfter(sid1, 'task', { category: 'brain-safety' }, JSON.stringify({ threats: [], score: 0 }));
      var sig1 = hooks.getStrongestSignal(sid1);
      results.push(r('chat: signal after 5 L1', Array.isArray(sig1) && sig1.length > 0));
    } catch(e) { results.push(r('chat trigger error', false)); }

    // 2. Routing: task to brain category -> tool.execute.before fires
    try {
      var p = await import(pathToFileURL(path.join(H, 'src/plugin/brain-plugin.mjs')));
      var plug = await p.BrainPlugin({ on: function(){} });
      var sid2 = 'e2e-route-' + Date.now();
      var routeOk = false;
      try { await plug['tool.execute.before']({tool:'bash',sessionID:sid2},{args:{command:'ls'},messages:[]}); routeOk = true; } catch(e) { routeOk = false; }
      results.push(r('routing: tool.execute.before fires', routeOk));
      // System transform hook
      var sysOk = false;
      try { await plug['experimental.chat.system.transform']({sessionID:sid2},{system:['# BRAIN ORCHESTRATOR']}); sysOk = true; } catch(e) { sysOk = false; }
      results.push(r('routing: system.transform fires', sysOk));
      // Messages transform hook
      var msgOk = false;
      try { await plug['experimental.chat.messages.transform']({sessionID:sid2},{messages:[{info:{role:'user'},parts:[{type:'text',text:'hello'}]}]}); msgOk = true; } catch(e) { msgOk = false; }
      results.push(r('routing: messages.transform fires', msgOk));
    } catch(e) { results.push(r('routing test error', false)); }

    // 3. Dark mode: signal dedup (same signal not injected twice)
    try {
      var hooks2 = await import(pathToFileURL(path.join(H, 'src/plugin/brain-hooks.mjs')));
      var sid3 = 'e2e-dedup-' + Date.now();
      hooks2.onMessage(sid3, 'implement dark mode with 3 files for L3 swarm test');
      // Fire 5 L1 agents
      ['thalamus','amygdala','hippocampus','world-cortex','safety'].forEach(function(a) {
        hooks2.onToolAfter(sid3, 'task', { category: 'brain-' + a }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
      });
      var sigA = hooks2.getStrongestSignal(sid3);
      var sigB = hooks2.getStrongestSignal(sid3);
      results.push(r('dark: signal dedup (second call empty)', sigA.length > 0 && sigB.length === 0));
      // After new message, perceive signal fires again (L1 reset -> fresh perceive)
      hooks2.onMessage(sid3, 'add dark mode toggle');
      var sigC = hooks2.getStrongestSignal(sid3);
      results.push(r('dark: new signal after message', sigC.length > 0));
      // Swarm true for complex implementation task using trigger keywords + 15+ words
      hooks2.onMessage(sid3 + '-swarm', 'implement a complete dark mode feature with CSS variables and theme toggle across more than ten different files');
      var st3 = hooks2.getMentalState(sid3 + '-swarm');
      results.push(r('dark: swarm true for complex task', st3 && st3.swarm === true));
    } catch(e) { results.push(r('dark mode test error', false)); }

    // 4. Install cycle (non-destructive - just file checks)
    results.push(r('install: plugin file exists', fs.existsSync(cfg.PLUGIN_FILE)));
    results.push(r('install: skill file exists', fs.existsSync(cfg.SKILL_FILE)));
    results.push(r('install: agents dir exists', fs.existsSync(cfg.AGENTS_DIR)));
    results.push(r('install: prompts dir exists', fs.existsSync(cfg.PROMPTS_DIR)));
    // Check skill file has L1 section
    try {
      var skill = fs.readFileSync(cfg.SKILL_FILE, 'utf8');
      results.push(r('install: skill has brain orchestrator header', skill.indexOf('BRAIN ORCHESTRATOR') >= 0 || skill.indexOf('BRAIN MODE') >= 0));
      results.push(r('install: skill has 5 parallel tasks', skill.indexOf('5 in parallel') >= 0 || skill.indexOf('run_in_background') >= 0));
      results.push(r('install: skill has 5 L1 agents', skill.indexOf('brain-thalamus') >= 0 && skill.indexOf('brain-amygdala') >= 0 && skill.indexOf('brain-hippocampus') >= 0 && skill.indexOf('brain-world-cortex') >= 0 && skill.indexOf('brain-safety') >= 0));
    } catch(e) { results.push(r('install: skill read error', false)); }

    // 5. Activation: plugin loaded and hooks functional
    try {
      var p3 = await import(pathToFileURL(path.join(H, 'src/plugin/brain-plugin.mjs')));
      var plug3 = await p3.BrainPlugin({ on: function(){} });
      results.push(r('activation: plugin loads', true));
      results.push(r('activation: tool.execute.before is fn', typeof plug3['tool.execute.before'] === 'function'));
      results.push(r('activation: tool.execute.after is fn', typeof plug3['tool.execute.after'] === 'function'));
      results.push(r('activation: system.transform is fn', typeof plug3['experimental.chat.system.transform'] === 'function'));
    } catch(e) { results.push(r('activation test error', false)); }

    // 6. Runtime: hooks state evolves across multiple messages
    try {
      var h3 = await import(pathToFileURL(path.join(H, 'src/plugin/brain-hooks.mjs')));
      var sid4 = 'e2e-runtime-' + Date.now();
      // 3 messages
      h3.onMessage(sid4, 'first');
      h3.onMessage(sid4, 'second');
      h3.onMessage(sid4, 'third');
      var st4 = h3.getMentalState(sid4);
      results.push(r('runtime: cycle=3 after 3 messages', st4 && st4.cycle === 3));
      // T4 event handling
      h3.onEvent('session.idle', { sessionID: sid4 });
      st4 = h3.getMentalState(sid4);
      results.push(r('runtime: state persists after T4', st4 && st4.cycle === 3));
      // Working memory after L1
      h3.onToolAfter(sid4, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate:'PASS', urgency:0.3, intent:'test' }));
      var wm4 = h3.getWorkingMemory(sid4);
      results.push(r('runtime: working memory populated', wm4 && wm4.thalamus !== undefined));
      // T1 safety check
      var t1ok = false;
      try { h3.onToolBefore(sid4, 'bash', { command: 'ls' }); t1ok = true; } catch(e) { t1ok = false; }
      results.push(r('runtime: T1 safe passes', t1ok));
      // Signal summary
      var sum = h3.getSignalSummary(sid4);
      results.push(r('runtime: signal summary non-empty', typeof sum === 'string' && sum.length > 0));
    } catch(e) { results.push(r('runtime test error', false)); }

    // 7. Conformance: plugin structure matches spec
    try {
      var src2 = fs.readFileSync(cfg.PLUGIN_FILE, 'utf8');
      results.push(r('conf: G7 audit hook', src2.indexOf('G7') >= 0));
      results.push(r('conf: BrainPlugin exported', src2.indexOf('export const BrainPlugin') >= 0));
      results.push(r('conf: audit function defined', src2.indexOf('function audit') >= 0));
      results.push(r('conf: warnLog function defined', src2.indexOf('function warnLog') >= 0));
    } catch(e) { results.push(r('conformance error', false)); }

    // 8. BrainTracer integration
    try {
      var h4 = await import(pathToFileURL(path.join(H, 'src/plugin/brain-hooks.mjs')));
      var sid5 = 'e2e-tracer-' + Date.now();
      h4.BrainTracer.append(sid5, 'TEST_EVENT', { data: 'xyz' });
      var events = h4.BrainTracer.export(sid5);
      results.push(r('tracer: append + export', events.length === 1 && events[0].event === 'TEST_EVENT'));
      var filtered = h4.BrainTracer.query(sid5, { event: 'TEST_EVENT' });
      results.push(r('tracer: query filter', filtered.length === 1));
      // Flush
      var payload = h4.BrainTracer.flush(sid5, 'mid-1');
      results.push(r('tracer: flush returns payload', payload && payload.trace && payload.trace.length === 1));
      var afterFlush = h4.BrainTracer.export(sid5);
      results.push(r('tracer: buffer cleared after flush', afterFlush.length === 0));
    } catch(e) { results.push(r('tracer integration error', false)); }

    var passed = results.every(function(r2) { return r2.pass; });
    var failed = results.filter(function(r2) { return !r2.pass; }).map(function(r2) { return r2.name; });
    return { passed: passed, message: passed ? 'All ' + results.length + ' E2E checks passed' : 'FAIL: ' + failed.join('; '), time_ms: Date.now() - start };
  },
};
