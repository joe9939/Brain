const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const nl = '\n';

// === Wave C: WTA + Reward->Attention ===

// Find L2 collect section end (before --- separator)
const l2End = nl + '---' + nl + nl + '## L3: SWARM PIPELINE';
if (c.indexOf(l2End) >= 0) {
  // Insert WTA section + reward attention before L3
  const wtaSection = nl + '### Gate Competition — Winner-Take-Most Selection' + nl + nl +
    'Each matching gate gets a score before firing:' + nl +
    'gate_score = urgency * 0.4 + reward_bias * 0.3 + safety_priority * 0.3' + nl +
    '// reward_bias = attention_priority_bias from L1.5 Step 4 (within budget cap)' + nl +
    'Sort gates descending by score. Execute top-2 in parallel (limited by attention_budget.remaining).' + nl +
    'All configured gates remain eligible each cycle - WTA only orders and limits, never permanently excludes.' + nl;
  c = c.replace(l2End, wtaSection + l2End);
  
  // Also add attention_priority_bias to L1.5 Step 4
  const rewardMultLine = 'amygdala.reward_multiplier = clamp(current_mood.intensity * 1.0 + 0.2, 0.3, 0.9)';
  const biasLine = '  // Reward->attention modulation (within budget cap)' + nl +
    'attention_priority_bias = clamp(GLOBAL_STATE.reward.score * 0.03, 0, 0.5)';
  c = c.replace(rewardMultLine, rewardMultLine + nl + biasLine);
}

// === Wave D: Mood->All + Personality->L3/Post ===

// Add mood to L3 planner prompt
c = c.replace(
  '### Step 1: SWARM-PLANNER' + nl + nl + '```' + nl + 'task(category="brain-swarm-planner"',
  '### Step 1: SWARM-PLANNER' + nl + nl + '```' + nl + '// Current mood context for planner: {GLOBAL_STATE.mood.mode} (intensity: {GLOBAL_STATE.mood.intensity})' + nl + 'task(category="brain-swarm-planner"'
);

// Add personality to POST-ACTION self-enhance
c = c.replace(
  '### Step 1: Self-enhance reflexion' + nl + nl + '```' + nl + 'task(category="brain-self-enhance"',
  '### Step 1: Self-enhance reflexion' + nl + nl + '```' + nl + '// Personality context: {GLOBAL_STATE.personality} - biases reflection depth and risk tolerance' + nl + 'task(category="brain-self-enhance"'
);

// === Wave E: World Model Predict->Verify ===

// Add world_predict before L3 coder
c = c.replace(
  '### Step 2: SWARM-CODER per node' + nl + nl + 'Fire ALL nodes',
  '### Step 1b: WORLD PREDICT (before implementing)' + nl + nl + '```' + nl + '// world_predict() - advisory prediction before implementation' + nl + 'let prediction = world_predict({plan: swarm_plan})' + nl + '// Prediction is advisory, not blocking' + nl + '```' + nl + nl + '### Step 2: SWARM-CODER per node' + nl + nl + 'Fire ALL nodes'
);

// Add world_diff to POST Step 4
c = c.replace(
  '### Step 4: World update' + nl + nl + '```' + nl + 'world_update({changed_files: ["path1", "path2"]})' + nl + '```',
  '### Step 4: World update' + nl + nl + '```' + nl + 'world_update({changed_files: ["path1", "path2"]})' + nl + '// Verify prediction vs actual' + nl + 'let diff = world_diff({predicted: prediction, actual: changed_files})' + nl + 'GLOBAL_STATE.reward.score = clamp(diff.accuracy * 10, 0, 10)' + nl + '```'
);

// === Wave F: Learning Feedback Loop ===

// Add recent_lessons to POST self-enhance
c = c.replace(
  '### Step 1: Self-enhance reflexion' + nl + nl + '```' + nl + '// Personality context:',
  '### Step 1: Self-enhance reflexion' + nl + nl + '```' + nl + '// Tag reflexion lessons for next L1 cycle' + nl + 'memory_store({type:"reflexion_lesson", key:"recent_lesson:{timestamp}", content: {lessons}, ttl_days: 1})' + nl + '// Personality context:'
);

// === Wave G: OODA Loop Closure ===

// Add OODA docstring to CORE RULE
c = c.replace(
  'Follow the phases below IN ORDER. Each phase is mandatory. Do NOT skip validation.',
  'Follow the phases below IN ORDER. Each phase is mandatory. Do NOT skip validation.' + nl + nl + '### OODA Loop (Observe-Orient-Decide-Act)' + nl + 'L1(Observe) -> L1.5(Orient) -> L2(Decide) -> L3(Act) -> POST(Record) -> L1 next cycle(Observe change)'
);

// Add cycle count to status display
c = c.replace(
  '[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]',
  '[BUDGET: remaining:{GLOBAL_STATE.attention_budget.remaining.toFixed(2)} cap:1.0]' + nl + '[OODA: cycle#{cycle_count}]'
);

fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
const lines = c.split('\n').length;
console.log('OK, lines:', lines);
