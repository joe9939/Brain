// debug.js — debug gate recording test
const { BrainTracer, onToolBefore } = require('../../src/plugin/brain-hooks.mjs');
const sid = 'debug-' + Date.now();

try {
  onToolBefore(sid, 'bash', { command: 'echo hello' });
  console.log('After echo:', JSON.stringify(BrainTracer.export(sid)));
} catch(e) { console.error('Echo error:', e.message); }

try {
  onToolBefore(sid, 'bash', { command: 'rm -rf /' });
} catch(e) {
  console.log('Rm caught:', e.message);
}

try {
  const events = BrainTracer.query(sid, {event:'T1:before'});
  console.log('After rm:', JSON.stringify(events));
  const blocked = events.filter(e => e && e.data && e.data.blocked === true);
  console.log('Blocked count:', blocked.length);
} catch(e) { console.error('Query error:', e.message); }
