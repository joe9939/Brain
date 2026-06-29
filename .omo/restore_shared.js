const fs = require('fs');
const f = 'C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md';
let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const nl = '\n';

const sharedSection = `## SHARED STATE — Global persistence layer shared across all circuits

GLOBAL_STATE = {
  mood: {mode: "NORMAL"|"URGENT"|"CAUTION"|"EXPLORE"|"SUPPORT", intensity: 0.0-1.0, triggers: []},
  reward: {score: 0-10, multiplier: 0.3-0.9, history: []},
  world_digest: {changed_files: [...], affected_modules: [...], timestamp: 0},
  safety_level: "normal"|"heightened"|"strict",
  personality: {openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, neuroticism: 0.3, agreeableness: 0.6},
  attention_budget: {remaining: 1.0, cap: 1.0, priority_threads: []}
}

### Load / Save Pattern

All phases start by loading:
\`\`\`
GLOBAL_STATE = memory_store.get("global_state")
\`\`\`

And write back at phase end:
\`\`\`
memory_store(key="global_state", content=GLOBAL_STATE)
\`\`\`

### Conflict Resolution Rules

Three cross-circuit conflict rules that resolve competing signals:

1. **(D-K) attention_budget is outer cap** — reward modulation within remaining budget
   \`reward.multiplier = min(reward.multiplier, attention_budget.remaining * 1.2)\`
2. **(B-J) safety_level=CAUTION freezes trait drift, pauses DMN loop**
3. **(H-I) threshold = personality_base + mood_offset, clamped [0.0, 1.0]**
`;

// Insert after CORE RULE section (after the OODA line)
c = c.replace(
  'L1(Observe) -> L1.5(Orient) -> L2(Decide) -> L3(Act) -> POST(Record) -> L1 next cycle(Observe change)' + nl + nl + '---' + nl + nl + '## L1:',
  'L1(Observe) -> L1.5(Orient) -> L2(Decide) -> L3(Act) -> POST(Record) -> L1 next cycle(Observe change)' + nl + nl + sharedSection + nl + '---' + nl + nl + '## L1:'
);

// Also write the source file oh-my-openagent.jsonc with models
const src = 'C:\\Users\\86189\\Desktop\\brain-agent\\oh-my-openagent.jsonc';
let sc = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

// Add model to all brain-* categories in the source file
const modelLine = '"model": "opencode-go/deepseek-v4-flash",\n      ';
sc = sc.replace(
  /("brain-\w+": \{\n)(      "variant":)/g,
  '$1      ' + modelLine + '$2'
);

fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
fs.writeFileSync(src, sc.replace(/\n/g, '\r\n'), 'utf8');
const lines = c.split('\n').length;
console.log('OK, lines:', lines);
