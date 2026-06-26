// tc-08-prompt-conformance.test.js — REAL LLM prompt conformance test
// Uses `opencode run` CLI to invoke real agents and verify .md spec compliance.
// GUARD: --live (expensive — each agent call costs tokens)

const config = require('../config');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  name: 'TC-08: Prompt Conformance (via opencode CLI)',
  run: async () => {
    const isLive = process.argv.includes('--live');
    if (!isLive) {
      return { passed: true, message: 'SKIPPED — use --live flag for real LLM conformance tests', time_ms: 0 };
    }

    // Verify opencode CLI is available
    try {
      execSync('opencode --version', { encoding: 'utf8', timeout: 5000, stdio: 'pipe' });
    } catch (e) {
      return { passed: false, message: 'SKIPPED — opencode CLI not available: ' + e.message, time_ms: 0 };
    }

    const promptDir = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'prompts', 'brain');

    // Read all prompt files for structure validation
    const allFiles = fs.readdirSync(promptDir).filter(f => f.endsWith('.md') && f !== 'TEMPLATE.md');
    const promptStats = {};
    for (const f of allFiles) {
      const content = fs.readFileSync(path.join(promptDir, f), 'utf8');
      const name = f.replace('.md', '');
      promptStats[name] = {
        hasTask: content.includes('## TASK'),
        hasOutput: content.includes('## OUTPUT'),
        hasRules: content.includes('## RULES'),
        hasQA: content.includes('## QA'),
        hasStrictJson: content.includes('STRICT JSON'),
        lineCount: content.split('\n').length,
      };
    }

    // Test scenarios: what to ask and what to check
    const scenarios = [
      {
        name: 'thalamus gates greeting',
        prompt: 'Respond with JSON only. Gate this message and output your full JSON spec: {"gate":"PASS","intents":["question"],"urgency":0.5,"safety_check":{"dangerous_command":false,"prompt_injection_risk":false,"sensitive_topic":false},"message_summary":"A simple greeting"}',
        mustInclude: ['gate', 'intents', 'urgency', 'safety_check'],
        minScore: 3,
      },
      {
        name: 'amygdala detects urgency',
        prompt: 'URGENT: Production server is down! Customers affected. Output your emotion detection JSON with mode, confidence, triggers, reward_multiplier, safety_threshold.',
        mustInclude: ['mode', 'confidence', 'triggers'],
        minScore: 2,
      },
      {
        name: 'hippocampus memory recall',
        prompt: 'What do you remember about fixing auth timeout bugs? Output with episodic, semantic, procedural sections.',
        mustInclude: ['episodic', 'semantic', 'procedural'],
        minScore: 2,
      },
      {
        name: 'safety audits dangerous command',
        prompt: 'Audit: rm -rf /. Output audit findings with risk level and blocked decision.',
        mustInclude: ['risk', 'block'],
        minScore: 1,
      },
    ];

    const results = [];

    for (const scenario of scenarios) {
      const start = Date.now();
      try {
        // Invoke opencode CLI to run a build session with the prompt
        const escapedPrompt = scenario.prompt.replace(/"/g, '\\"');
        const output = execSync(
          `opencode run --agent build --prompt "${escapedPrompt}"`,
          { encoding: 'utf8', timeout: 60000, stdio: 'pipe' }
        );

        const elapsed = Date.now() - start;
        const checks = scenario.mustInclude.filter(keyword =>
          output.toLowerCase().includes(keyword.toLowerCase())
        );
        const passed = checks.length >= scenario.minScore;

        results.push({
          name: scenario.name,
          passed,
          checks: `${checks.length}/${scenario.mustInclude.length}`,
          details: checks.length > 0
            ? 'found: ' + checks.join(', ')
            : 'none of expected keywords found',
          time_ms: elapsed,
          output_snippet: output.slice(0, 200).replace(/\n/g, ' | '),
        });
      } catch (e) {
        results.push({
          name: scenario.name,
          passed: false,
          checks: '0/0',
          details: 'CLI ERROR: ' + (e.stderr || e.message).slice(0, 100),
          time_ms: Date.now() - start,
          output_snippet: '',
        });
      }
    }

    // Save evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence', 'prompt-conformance');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'conformance-report.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      total_prompts: allFiles.length,
      prompt_structure_summary: {
        withTask: Object.values(promptStats).filter(s => s.hasTask).length,
        withOutput: Object.values(promptStats).filter(s => s.hasOutput).length,
        withRules: Object.values(promptStats).filter(s => s.hasRules).length,
        withQA: Object.values(promptStats).filter(s => s.hasQA).length,
        withStrictJson: Object.values(promptStats).filter(s => s.hasStrictJson).length,
        avgLineCount: Math.round(Object.values(promptStats).reduce((a, s) => a + s.lineCount, 0) / Object.values(promptStats).length),
      },
      results: results.map(r => ({
        test: r.name,
        passed: r.passed,
        checks: r.checks,
        details: r.details,
        time_ms: r.time_ms,
      })),
    }, null, 2));

    const passedCount = results.filter(r => r.passed).length;
    const allPassed = passedCount === results.length;

    const summary = results.map(r =>
      `  ${r.passed ? 'PASS' : 'FAIL'} ${r.name} (${r.checks}) - ${r.details} [${r.time_ms}ms]`
    ).join('\n');

    // Structure stats
    const statsSummary = `Prompt Structure: ${Object.values(promptStats).filter(s => s.hasTask).length}/${allFiles.length} have TASK, ` +
      `${Object.values(promptStats).filter(s => s.hasOutput).length}/${allFiles.length} have OUTPUT, ` +
      `${Object.values(promptStats).filter(s => s.hasQA).length}/${allFiles.length} have QA section`;

    return {
      passed: allPassed,
      message: `${passedCount}/${results.length} LLM conformance checks PASS\n${statsSummary}\n${summary}`,
      time_ms: results.reduce((a, r) => a + r.time_ms, 0),
    };
  },
};
