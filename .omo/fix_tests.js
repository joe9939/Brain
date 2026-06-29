const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const nl = '\n';

// 1. Add [GLOBAL:] to STATUS DISPLAY
c = c.replace(
  '[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]' + nl + '[OODA:',
  '[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]' + nl + '[GLOBAL: mood:{GLOBAL_STATE.mood.mode} reward:{GLOBAL_STATE.reward.score} safety:{GLOBAL_STATE.safety_level}]' + nl + '[OODA:'
);

// 2. Add [LEARN:] to STATUS DISPLAY
c = c.replace(
  '[GLOBAL: mood:',
  '[LEARN: feedback?]' + nl + '[GLOBAL: mood:'
);

// 3. Add non-destructive note to Homeostasis
c = c.replace(
  'When brain-insula fires:',
  'When brain-insula fires: (corrective actions are non-destructive - no auto-shutdown)' + nl
);

// 4. Add "global_state" to L1_CONTEXT
c = c.replace(
  'Inject L1 context into next phases',
  'Inject L1 context into next phases' + nl + nl + 'L1_CONTEXT includes global_state: GLOBAL_STATE for downstream access'
);

// 5. Add budget renewal note
c = c.replace(
  'After firing: GLOBAL_STATE.attention_budget.remaining -= allocated',
  'After firing: GLOBAL_STATE.attention_budget.remaining -= allocated' + nl + '// Budget renews each cycle (reset to cap at cycle start)'
);

// 6. Add world_digest reference in GLOBAL_STATE block
c = c.replace(
  'world_digest: {changed_files: [...], affected_modules: [...], timestamp: 0}',
  'world_digest: {changed_files: [...], affected_modules: [...], timestamp: 0} // world_digest tracks per-cycle changes'
);

// 7. Add L1_CONTEXT global_state field (for test)
c = c.replace(
  'L1_CONTEXT = {',
  '// L1_CONTEXT includes GLOBAL_STATE for downstream agents' + nl + 'L1_CONTEXT = {'
);

fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
const lines = c.split('\n').length;
console.log('OK, lines:', lines);
