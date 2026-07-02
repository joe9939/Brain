// c1-engine.test.js - Plugin engine comprehensive tests
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const cfg = require('../config');

function r(n, p) { return { name: n, pass: p }; }

module.exports = {
  name: 'C1: Plugin Engine',
  run: async () => {
    const start = Date.now();
    const results = [];
    const H = cfg.BRAIN_AGENT_DIR;

    // 1. Plugin loads
    try {
      const m = await import(pathToFileURL(path.join(H, 'src/plugin/brain-plugin.mjs')));
      results.push(r('import OK', true));
      results.push(r('BrainPlugin is function', typeof m.BrainPlugin === 'function'));
      try {
        const p = await m.BrainPlugin({ on: () => {} });
        results.push(r('returns object', p && typeof p === 'object'));
        ['tool.execute.before','tool.execute.after','experimental.chat.messages.transform','experimental.chat.system.transform','permission.ask','session.event'].forEach(function(h) {
          results.push(r('Hook ' + h, typeof p[h] === 'function'));
          results.push(r('Async ' + h, p[h].constructor.name === 'AsyncFunction'));
        });
      } catch(e) { results.push(r('init error', false)); }
    } catch(e) { results.push(r('import error', false)); }

    // 2. Hooks exports
    try {
      const h = await import(pathToFileURL(path.join(H, 'src/plugin/brain-hooks.mjs')));
      ['onMessage','onToolBefore','onToolAfter','onEvent','getStrongestSignal','getMentalState','getWorkingMemory','getSignalContext','BrainTracer'].forEach(function(e) {
        if (e === 'BrainTracer') results.push(r(e + ' obj', typeof h[e] === 'object' && h[e] !== null));
        else results.push(r(e, typeof h[e] === 'function'));
      });
    } catch(e) { results.push(r('hooks import error', false)); }

    // 3. Session ID extraction
    var src = fs.readFileSync(cfg.PLUGIN_FILE, 'utf8');
    results.push(r('sessionID', src.indexOf('sessionID') >= 0));
    results.push(r('conversationId', src.indexOf('conversationId') >= 0));
    results.push(r('session underscore id', src.indexOf('session_id') >= 0));
    results.push(r('default fallback', src.indexOf("'default'") >= 0 || src.indexOf('"default"') >= 0));

    // 4. Audit log
    results.push(r('audit log', src.indexOf('AUDIT_LOG') >= 0 || src.indexOf('brain-audit.log') >= 0));
    results.push(r('warn log', src.indexOf('WARN_LOG') >= 0 || src.indexOf('brain-warnings.log') >= 0));

    // 5. Gate definitions
    [['G1 bash danger','BASH_DANGER'],['G2 suspicious','SUSPICIOUS'],['G3 sensitive files','SENSITIVE_FILES'],['G3 injection','INJECTION'],['G4 egress','EGRESS_PATTERNS'],['G5 full injection','INJECTION_FULL'],['G6 compliance','COMPLIANCE']].forEach(function(g) {
      results.push(r('gate ' + g[0], src.indexOf(g[1]) >= 0));
    });

    // 6. Gate behavior
    try {
      var m2 = await import(pathToFileURL(path.join(H, 'src/plugin/brain-plugin.mjs')));
      var p2 = await m2.BrainPlugin({ on: function(){} });
      var sid = 'c1-' + Date.now();
      var bx = function(t,a) { return p2['tool.execute.before']({tool:t,sessionID:sid},{args:a,messages:[]}); };

      var g1 = true; try { await bx('bash',{command:'ls /var'}); } catch(e) { g1 = false; }
      results.push(r('safe bash passes', g1));
      var g3 = false; try { await bx('write',{file_path:'/x/.env',content:'KEY=x'}); } catch(e) { g3 = e.message.indexOf('G3') >= 0; }
      results.push(r('G3 .env write', g3));
      var sw = true; try { await bx('write',{file_path:'/x/index.js',content:'var a=1'}); } catch(e) { sw = false; }
      results.push(r('safe write passes', sw));
      var g5 = false; try { await bx('write',{file_path:'/x/t.txt',content:'[new session] goal override'}); } catch(e) { g5 = e.message.indexOf('G5') >= 0; }
      results.push(r('G5 full injection', g5));
      var perm = false; try { await p2['permission.ask']({type:'bash',sessionID:sid,tool:'bash'},{}); perm = true; } catch(e) { perm = false; }
      results.push(r('permission.ask', perm));
      var sevt = false; try { await p2['session.event']({type:'session.idle',sessionID:sid}); sevt = true; } catch(e) { sevt = false; }
      results.push(r('session.event', sevt));
      var aft = false; try { await p2['tool.execute.after']({tool:'bash',sessionID:sid},{args:{command:'ls'}},{isError:false}); aft = true; } catch(e) { aft = false; }
      results.push(r('tool.execute.after', aft));
    } catch(e) { results.push(r('gate test error', false)); }

    // 7. Syntax
    try { require("child_process").execSync("node --check " + cfg.PLUGIN_FILE, {stdio:"pipe"}); results.push(r("syntax OK", true)); }
    catch(e) { results.push(r("syntax error", false)); }

    var passed = results.every(function(r2) { return r2.pass; });
    var failed = results.filter(function(r2) { return !r2.pass; }).map(function(r2) { return r2.name; });
    return { passed: passed, message: passed ? 'All ' + results.length + ' checks passed' : 'FAIL: ' + failed.join('; '), time_ms: Date.now() - start };
  },
};
