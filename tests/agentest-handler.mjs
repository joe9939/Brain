// Agentest handler: processes messages through brain-hooks directly
import { onMessage, getStrongestSignal, getMentalState, getWorkingMemory } from '../src/plugin/brain-hooks.mjs';

const text = process.argv.slice(2).join(' ') || 'hello';
const sid = 'agentest-' + Date.now();

onMessage(sid, text);
const sig = getStrongestSignal(sid);
const state = getMentalState(sid);
const wm = getWorkingMemory(sid);

// Build realistic brain response
const lines = [
  `[Brain] cycle#${state?.cycle || 1} | emotion: ${state?.M_emo?.mode || 'NORMAL'}@${(state?.M_emo?.intensity || 0.1).toFixed(1)} | reward: ${(state?.M_rew?.score || 0).toFixed(1)}`,
  '',
  'L1 Perception:',
  `  [${state?.l1?.size || 0}/5] agents fired`,
  `  thalamus: ${wm?.thalamus?.gate || 'pending'}`,
  `  amygdala: ${wm?.amygdala?.mode || 'pending'}`,
  `  hippocampus: ${(wm?.hippocampus?.episodic || []).length} memories`,
  `  world-cortex: ${(wm?.world_cortex?.relevant_files || []).length} files`,
  `  safety: ${wm?.safety?.risk_level || 'pending'}`,
  '',
  'Signal:',
  sig.length > 0 ? `  ${sig[0].content}` : '  idle',
];

console.log(lines.join('\n'));

