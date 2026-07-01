// 🧪 直接测试 brain-plugin.mjs hooks
import { BrainPlugin } from '../../src/plugin/brain-plugin.mjs';
import { onMessage, onToolBefore, onToolAfter, getStrongestSignal, getMentalState, getWorkingMemory } from '../../src/plugin/brain-hooks.mjs';

const results = [];
function check(name, pass) { results.push({ name, pass }); console.log(pass ? '✅' : '❌', name); }

// ── 1. Plugin 加载 ──
try {
  const ctx = { directory: process.cwd() };
  const plugin = await BrainPlugin(ctx);
  check('BrainPlugin loaded', typeof plugin === 'object');
  check('Has tool.execute.before', typeof plugin['tool.execute.before'] === 'function');
  check('Has tool.execute.after', typeof plugin['tool.execute.after'] === 'function');
  check('Has chat.message', typeof plugin['chat.message'] === 'function');
  check('Has session.event', typeof plugin['session.event'] === 'function');
} catch (e) { check('Plugin load failed: ' + e.message, false); }

// ── 2. G1 安全门 ──
try {
  onToolBefore('test', 'bash', { command: 'ls -la' });
  check('G1: normal command passes', true);
} catch (e) { check('G1: normal command threw', false); }

try {
  onToolBefore('test', 'bash', { command: 'rm -rf /' });
  check('G1: rm -rf / NOT blocked', false);
} catch (e) {
  check('G1: rm -rf / blocked', e.message === 'G1 BLOCK');
}

// ── 3. T3 消息处理 + 信号 ──
const sidComplex = 'test-complex';
onMessage(sidComplex, 'implement a complex feature that requires multiple steps and careful planning');
const sig = getStrongestSignal(sidComplex);
check('T3: complex → action signal', sig.length > 0 && sig[0].content.includes('Action'));

const state = getMentalState(sidComplex);
check('T3: state created', state && state.cycle === 1);
check('T3: swarm flagged (15+ words)', state && state.swarm === true);

// ── 4. T2 L1 追踪 ──
const sid = 'test-l1';
onMessage(sid, 'hello');
onToolAfter(sid, 'task', { category: 'brain-thalamus' }, '{"gate":"PASS","urgency":0.5}');
onToolAfter(sid, 'task', { category: 'brain-amygdala' }, '{"mode":"NORMAL","confidence":0.8}');
onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, '{"episodic":[],"semantic":[]}');
onToolAfter(sid, 'task', { category: 'brain-world-cortex' }, '{"relevant_files":[]}');
onToolAfter(sid, 'task', { category: 'brain-safety' }, '{"risk_level":"normal"}');

const s2 = getMentalState(sid);
check('T2: 5/5 L1 completed', s2 && s2.l1.size === 5);

const wm = getWorkingMemory(sid);
check('WM: thalamus stored', wm && wm.thalamus && wm.thalamus.gate === 'PASS');
check('WM: amygdala stored', wm && wm.amygdala && wm.amygdala.mode === 'NORMAL');

// ── 5. 信号切换 ──
onMessage('test-sig2', 'urgent: production is down!');
onToolAfter('test-sig2', 'task', { category: 'brain-amygdala' }, '{"mode":"URGENT","confidence":0.9}');
const sig2 = getStrongestSignal('test-sig2');
check('Signal: URGENT → emotion signal present', sig2.length > 0 && sig2[0].content.includes('URGENT'));

// ── 6. G3 敏感文件 ──
// 通过 plugin 测试敏感文件写入
try {
  const out = { args: { file_path: '/path/.env', content: 'API_KEY=xxx' }, messages: [] };
  await (await BrainPlugin({ directory: '.' }))['tool.execute.before'](
    { tool: 'write', sessionID: 'test-g3' }, out
  );
  check('G3: .env file blocked', out.messages.some(m => m.content.includes('G3')));
} catch (e) {
  check('G3: .env blocked via throw', e.message?.includes('G3'));
}

// ── 总结 ──
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`\n=== ${passed}/${results.length} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
