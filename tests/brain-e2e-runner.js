// brain-e2e-runner.js — Automated Brain E2E Test Runner
// node tests/brain-e2e-runner.js
//
// Validates brain-master.md contains all expected circuit patterns.
// Each scenario checks that specific keywords/circuit names exist in the prompt.

const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname, '..', '.omo', 'evidence');
const SKILL_FILE = path.resolve(__dirname, '..', '.opencode', 'skills', 'brain-master.md');
const REPORT_FILE = path.resolve(__dirname, '..', '.omo', 'brain-e2e-report.json');

if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SCENARIOS = {
  L1:              { pattern: 'brain-thalamus brain-amygdala brain-hippocampus brain-world-cortex brain-safety' },
  L2_SAFETY:       { pattern: 'brain-safety' },
  GLOBAL_STATE:    { pattern: 'GLOBAL_STATE' },
  OODA_LOOP:       { pattern: 'OODA Loop' },
  MOOD:            { pattern: 'mood_decay' },
  PERSONALITY:     { pattern: 'PERSONALITY:' },
  WTA:             { pattern: 'Winner-Take-Most' },
  HOMEOSTASIS:     { pattern: 'Homeostasis' },
  ATTENTION_BUDGET:{ pattern: 'attention_budget' },
  LEARNING_LOOP:   { pattern: 'recent_lessons' },
  CONSENSUS:       { pattern: 'Consensus Gate' },
  CONTAGION:       { pattern: 'emotional contagion' },
  CAUSAL:          { pattern: 'causal impact' },
  VERSIONED:       { pattern: '_version' },
  GATE_TUNER:      { pattern: 'brain-gate-tuner' },
  CURIOSITY:       { pattern: 'brain-curiosity' },
  META_LEARNER:    { pattern: 'brain-meta-learner' },
  RED_TEAM:        { pattern: 'brain-red-team' },
  ARCHITECT:       { pattern: 'brain-architect' },
  CONFLICT_RES:    { pattern: 'memory_detect_conflicts' },
};

function run() {
  const content = fs.readFileSync(SKILL_FILE, 'utf8');
  const keys = Object.keys(SCENARIOS);
  let passed = 0;
  const results = [];

  console.log('\n=== Brain E2E Test Runner ===\n');

  keys.forEach((k) => {
    const terms = SCENARIOS[k].pattern.split(' ');
    const checks = terms.map((t) => ({ term: t, found: content.includes(t) }));
    const failures = checks.filter((c) => !c.found).map((c) => c.term);
    const ok = failures.length === 0;
    if (ok) passed++;
    results.push({ scenario: k, passed: ok, failures });

    const status = ok ? 'PASS' : 'FAIL';
    console.log(`  ${status}  ${k.padEnd(20)} ${SCENARIOS[k].pattern}`);

    // Write evidence
    const md = [
      `# E2E: ${k}`,
      `**Status**: ${status}`,
      '',
      '## Checks',
      ...checks.map((c) => `- [${c.found ? 'x' : ' '}] ${c.term}`),
      ...(failures.length ? ['', '## Failures', ...failures.map((f) => `- Missing: ${f}`)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(EVIDENCE_DIR, `e2e-${k.toLowerCase()}.md`), md);
  });

  const total = keys.length;
  console.log(`\n=== ${passed}/${total} passed ===\n`);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: `${passed}/${total}`,
    results,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
}

run();
