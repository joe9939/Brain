const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8');

// Normalize to LF
const nl = '\n';
c = c.replace(/\r\n/g, nl);

// 1. Add insula row + Homeostasis + Budget after gate table
const gateEnd = '| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |' + nl + nl + '### L2 prompt template';
const gateReplace = '| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |' + nl + '| monitor.alert (health < 0.5) | brain-insula | L1_CONTEXT + alert details |' + nl + nl + '### Homeostasis Response — Corrective action on system anomaly' + nl + nl + 'When brain-insula fires:' + nl + '1. **Reduce load**: GLOBAL_STATE.attention_budget.remaining = max(0.3, remaining - 0.2)' + nl + '2. **Raise safety**: GLOBAL_STATE.safety_level = "heightened"' + nl + '3. **Log**: monitor_report_event({type:"homeostasis", action:"corrective"})' + nl + nl + '### Attention Budget Enforcement' + nl + nl + 'Before firing L2 gates, check budget:' + nl + '- remaining = GLOBAL_STATE.attention_budget.remaining' + nl + '- Only fire gates where gate_weight / total_weight <= remaining' + nl + '- After firing: GLOBAL_STATE.attention_budget.remaining -= allocated' + nl + nl + '### L2 prompt template';
c = c.replace(gateEnd, gateReplace);

// 2. L1 step 1 title
c = c.replace(
  '### Step 1: Fire ALL 4 L1 agents in PARALLEL',
  '### Step 1: Fire ALL 5 L1 agents in PARALLEL (4 original + safety background monitor)'
);

// 3. Add safety task
const wcEnd = 'NO wrapper text. Message: <message>")' + nl + '```';
const safetyBlock = nl + 'task(category="brain-safety", run_in_background=true,' + nl + '     prompt="Background safety scan. OUTPUT STRICT JSON: {risk_level:\\"normal\\"|\\"heightened\\"|\\"strict\\", alerts:[], override_l2:false} NO wrapper text. Message: <message>")' + nl + '```';
const wcIdx = c.indexOf(wcEnd);
if (wcIdx >= 0) {
  const before = c.substring(0, wcIdx + wcEnd.length);
  const after = c.substring(wcIdx + wcEnd.length);
  c = before + safetyBlock + after;
}

// 4. Update task_ids
c = c.replace(
  'Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`.',
  'Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`, `bg_safety_bg`.'
);

// 5. Add status display lines (find the first STATUS DISPLAY block)
const statusMarker = '### Status display line' + nl + nl + '```' + nl + '[L1.5: mood_decay';
const statusReplace = '### Status display line' + nl + nl + '```' + nl + '[HOMEOSTASIS: insula? load:normal safety:heightened]' + nl + '[SAFETY: bg? level:{safety.risk_level}]' + nl + '[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]' + nl + '[L1.5: mood_decay';
c = c.replace(statusMarker, statusReplace);

// Write back with CRLF
fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
const lines = c.split('\n').length;
console.log('OK, lines:', lines);
