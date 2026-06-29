const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8');

// 1. Add insula row + Homeostasis + Budget after gate table
c = c.replace(
  '| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |\n\n### L2 prompt template',
  '| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |\n| monitor.alert (health less than 0.5) | brain-insula | L1_CONTEXT + alert details |\n\n### Homeostasis Response — Corrective action on system anomaly\n\nWhen brain-insula fires:\n1. **Reduce load**: GLOBAL_STATE.attention_budget.remaining = max(0.3, remaining - 0.2)\n2. **Raise safety**: GLOBAL_STATE.safety_level = "heightened"\n3. **Log**: monitor_report_event({type:"homeostasis", action:"corrective"})\n\n### Attention Budget Enforcement\n\nBefore firing L2 gates, check budget:\n- remaining = GLOBAL_STATE.attention_budget.remaining\n- Only fire gates where gate_weight / total_weight <= remaining\n- After firing: GLOBAL_STATE.attention_budget.remaining -= allocated\n\n### L2 prompt template'
);

// 2. L1 step 1 title 4 to 5
c = c.replace(
  '### Step 1: Fire ALL 4 L1 agents in PARALLEL',
  '### Step 1: Fire ALL 5 L1 agents in PARALLEL (4 original + safety background monitor)'
);

// 3. Add safety task after world-cortex task  
const wcTaskEnd = 'NO wrapper text. Message: <message>")';
const safetyTask = '\ntask(category="brain-safety", run_in_background=true,\n     prompt="Background safety scan. OUTPUT STRICT JSON: {risk_level:\\"normal\\"|\\"heightened\\"|\\"strict\\", alerts:[], override_l2:false} NO wrapper text. Message: <message>")\n```';

// Find position after world-cortex task and its closing backticks
const wcIdx = c.indexOf(wcTaskEnd);
if (wcIdx >= 0) {
  const afterWcEnd = wcIdx + wcTaskEnd.length + 1; // +1 for newline
  const before = c.substring(0, afterWcEnd);
  const after = c.substring(afterWcEnd);
  c = before + safetyTask + after;
}

// 4. Update task_ids
c = c.replace(
  'Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`.',
  'Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`, `bg_safety_bg`.'
);

// 5. Add status display lines
c = c.replace(
  '### Status display line\n\n```\n[L1.5: mood_decay',
  '### Status display line\n\n```\n[HOMEOSTASIS: insula? load:normal safety:heightened]\n[SAFETY: bg? level:{safety.risk_level}]\n[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]\n[L1.5: mood_decay'
);

fs.writeFileSync(f, c, 'utf8');
const lines = c.split('\n').length;
console.log('OK, lines:', lines);
