const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const nl = '\n';

// Find the L1 Step 1 block boundaries
const step1Start = '### Step 1: Fire ALL 5 L1 agents in PARALLEL (4 original + safety background monitor)';
const step1End = '### Step 2: Collect ALL 4 results';

const startIdx = c.indexOf(step1Start);
const endIdx = c.indexOf(step1End);

if (startIdx >= 0 && endIdx >= 0) {
  const before = c.substring(0, startIdx);
  const after = c.substring(endIdx);
  
  const newStep1 = step1Start + nl + nl + '```' + nl +
    'task(category="brain-thalamus", run_in_background=true,' + nl +
    '     prompt="Gate this message. OUTPUT STRICT JSON: {gate, intents, urgency, urgency_sources: {explicit_keywords, implicit_tone, message_length}, safety_check: {dangerous_command, prompt_injection_risk, sensitive_topic}, message_summary} NO wrapper text. Message: <message>")' + nl +
    'task(category="brain-amygdala", run_in_background=true,' + nl +
    '     prompt="Detect mood. OUTPUT STRICT JSON: {mode: NORMAL|URGENT|EXPLORE|SUPPORT|CAUTION, confidence: 0-1, triggers: [...], response_speed: normal|fast|slow, response_tone: direct|patient|urgent|supportive, reward_multiplier: 0.3-0.9, safety_threshold: normal|heightened|strict} NO wrapper text. Message: <message>")' + nl +
    'task(category="brain-hippocampus", run_in_background=true,' + nl +
    '     prompt="Retrieve memories. Use memory_retrieve(mode=hybrid) with keywords from message. OUTPUT STRICT JSON: {episodic: [{id,summary,timestamp,session_id}], semantic: [{concept,detail,confidence}], procedural: [{pattern,confidence,status:active|proven|reflex|deprecated}], relevant_sops: [{name,status}]} Empty arrays if no matches. NO wrapper text. Message: <message>")' + nl +
    'task(category="brain-world-cortex", run_in_background=true,' + nl +
    '     prompt="Query codebase. Use world_query + codegraph_explore. OUTPUT STRICT JSON: {relevant_files: [...], symbols_found: [{name,kind,file}], impact_analysis: {high_risk: [...], affected_modules: [...]}, file_summaries: {filepath: description}} NO wrapper text. Message: <message>")' + nl +
    'task(category="brain-safety", run_in_background=true,' + nl +
    '     prompt="Background safety scan. OUTPUT STRICT JSON: {risk_level:\\"normal\\"|\\"heightened\\"|\\"strict\\", alerts:[], override_l2:false} NO wrapper text. Message: <message>")' + nl +
    '```' + nl;

  c = before + newStep1 + after;
  fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
  console.log('OK');
} else {
  console.log('ERROR: markers not found');
}
