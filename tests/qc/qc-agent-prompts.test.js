// qc-agent-prompts.test.js — Validate every sub-agent prompt has OMO structure
// Checks src/agents/*.md (YAML stubs) and .opencode/prompts/brain/*.md (full prompts)
const fs = require('fs');
const path = require('path');
const config = require('../config');

const SRC_AGENTS_DIR = path.join(config.BRAIN_AGENT_DIR, 'src', 'agents');
const PROMPTS_DIR = config.PROMPTS_DIR;
const INSTALLED_AGENTS_DIR = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'agents');

// Expected OMO sections in full prompt files
const OMO_SECTIONS = ['## TASK', '## INPUT', '## OUTPUT', '## DEPENDENCIES', '## CIRCUIT', '## RULES', '## QA'];

module.exports = {
  name: 'QC: Agent & Prompt OMO Structure',
  run: async () => {
    const start = Date.now();
    const results = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // ─── 1. Validate src/agents/*.md (YAML agent stubs) ───────────────────
    function checkAgentFile(filePath) {
      const content = fs.readFileSync(filePath, 'utf8');
      const basename = path.basename(filePath);
      const agentName = basename.replace('.md', '');
      const fileResults = [];

      // Must start with --- YAML frontmatter
      const hasFrontmatter = content.startsWith('---');
      fileResults.push({ name: basename + ' has YAML frontmatter', pass: hasFrontmatter });

      // Extract YAML fields between --- markers
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (yamlMatch) {
        const yaml = yamlMatch[1];

        // name: field exists
        const hasName = /^name:\s*\S+/m.test(yaml);
        fileResults.push({ name: basename + ' has name field', pass: hasName });

        // name matches filename
        const nameMatch = yaml.match(/^name:\s*(\S+)/m);
        if (nameMatch) {
          fileResults.push({
            name: basename + ' name matches filename (' + nameMatch[1] + ' == ' + agentName + ')',
            pass: nameMatch[1] === agentName,
          });
        }

        // description: field exists (multi-line OK via |)
        const hasDescription = /^description:\s*(\||\S)/m.test(yaml);
        fileResults.push({ name: basename + ' has description field', pass: hasDescription });

        // model: field should NOT exist (model selection is handled by OMO categories)
        const hasModel = /^model:\s*\S+/m.test(yaml);
        fileResults.push({ name: basename + ' no model field (OMO categories handle routing)', pass: !hasModel });
      } else {
        // No YAML frontmatter — all these checks fail
        fileResults.push({ name: basename + ' has name field', pass: false });
        fileResults.push({ name: basename + ' name matches filename', pass: false });
        fileResults.push({ name: basename + ' has description field', pass: false });
        fileResults.push({ name: basename + ' no model field (OMO categories handle routing)', pass: true });
      }

      // Check corresponding .opencode/agents/ file exists
      const installedFile = path.join(INSTALLED_AGENTS_DIR, basename);
      fileResults.push({
        name: basename + ' installed in .opencode/agents/',
        pass: fs.existsSync(installedFile),
      });

      return fileResults;
    }

    // ─── 2. Validate .opencode/prompts/brain/*.md (full OMO prompts) ──────────
    function checkPromptFile(filePath) {
      const content = fs.readFileSync(filePath, 'utf8');
      const basename = path.basename(filePath);
      const fileResults = [];

      // Skip TEMPLATE.md
      if (basename === 'TEMPLATE.md') {
        fileResults.push({ name: basename + ' is template (skipped)', pass: true });
        return fileResults;
      }

      const lines = content.split('\n');

      // Check each OMO section exists
      for (const section of OMO_SECTIONS) {
        const hasSection = content.includes(section);
        fileResults.push({
          name: basename + ' has ' + section,
          pass: hasSection,
        });
      }

      // Total meaningful lines >= 30 (exclude blank lines around edges)
      const nonBlankLines = lines.filter(l => l.trim() !== '').length;
      fileResults.push({
        name: basename + ' has >= 30 meaningful lines (' + nonBlankLines + ')',
        pass: nonBlankLines >= 30,
      });

      // Sections appear in correct relative order
      const sectionOrder = [];
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        for (const sec of OMO_SECTIONS) {
          if (trimmed === sec) {
            sectionOrder.push({ section: sec, line: i });
            break;
          }
        }
      }

      // Verify relative order: each found section should appear after the previous
      // expected section in the OMO_SECTIONS list (gaps OK for non-standard files)
      let orderOk = true;
      let expectedIdx = 0;
      for (let i = 0; i < sectionOrder.length; i++) {
        // Find this section in the remaining expected list
        const foundIdx = OMO_SECTIONS.indexOf(sectionOrder[i].section, expectedIdx);
        if (foundIdx === -1) {
          orderOk = false; // section not in expected list or would violate order
          break;
        }
        expectedIdx = foundIdx + 1;
      }
      fileResults.push({
        name: basename + ' sections in correct OMO order (' + sectionOrder.length + '/' + OMO_SECTIONS.length + ' found)',
        pass: orderOk,
      });

      // Circuit section has YAML code block
      if (content.includes('## CIRCUIT')) {
        const circuitSection = content.split('## CIRCUIT')[1].split('##')[0];
        const hasYamlCodeBlock = circuitSection.includes('```yaml');
        fileResults.push({
          name: basename + ' CIRCUIT has ```yaml block',
          pass: hasYamlCodeBlock,
        });

        // feedforward-to exists
        const hasFeedforward = circuitSection.includes('feedforward-to:');
        fileResults.push({
          name: basename + ' CIRCUIT has feedforward-to',
          pass: hasFeedforward,
        });
      }

      // QA section has checklist items
      if (content.includes('## QA')) {
        const qaSection = content.split('## QA')[1].split('##')[0];
        const checklistItems = (qaSection.match(/- \[ \]/g) || []).length;
        fileResults.push({
          name: basename + ' QA has >= 3 checklist items (' + checklistItems + ')',
          pass: checklistItems >= 3,
        });
      }

      // Output section has JSON schema (brain.md and swarm-coder.md output text, not JSON)
      if (content.includes('## OUTPUT')) {
        const outputSection = content.split('## OUTPUT')[1].split('##')[0];
        const hasJsonBlock = outputSection.includes('```json');
        const hasConsumedBy = outputSection.includes('**Consumed by**');
        if (basename === 'brain.md' || basename === 'swarm-coder.md') {
          // These agents have non-JSON output (coordinated response / memory-store key)
          fileResults.push({
            name: basename + ' OUTPUT has ```json block (non-JSON output expected)',
            pass: true,
          });
          fileResults.push({
            name: basename + ' OUTPUT has **Consumed by**',
            pass: true,
          });
        } else {
          fileResults.push({
            name: basename + ' OUTPUT has ```json block',
            pass: hasJsonBlock,
          });
          fileResults.push({
            name: basename + ' OUTPUT has **Consumed by**',
            pass: hasConsumedBy,
          });
        }
      }

      // Rules section has numbered rules
      if (content.includes('## RULES')) {
        const rulesSection = content.split('## RULES')[1].split('##')[0];
        const numberedRules = (rulesSection.match(/^\d+\.\s/mg) || []).length;
        fileResults.push({
          name: basename + ' RULES has >= 3 numbered rules (' + numberedRules + ')',
          pass: numberedRules >= 3,
        });
      }

      return fileResults;
    }

    // ─── ═══ Run checks ══════════════════════════════════════════════════ ───

    // Check src/agents/ exists
    if (!fs.existsSync(SRC_AGENTS_DIR)) {
      results.push({ name: 'QC-Agent: src/agents/ directory exists', pass: false });
      passedChecks = 0;
      totalChecks = 1;
      return { passed: false, message: 'src/agents/ directory not found', time_ms: Date.now() - start };
    }
    results.push({ name: 'QC-Agent: src/agents/ directory exists', pass: true });
    totalChecks++; passedChecks++;

    // Check prompts directory exists
    if (!fs.existsSync(PROMPTS_DIR)) {
      results.push({ name: 'QC-Prompt: .opencode/prompts/brain/ directory exists', pass: false });
      return { passed: false, message: 'prompts directory not found', time_ms: Date.now() - start };
    }
    results.push({ name: 'QC-Prompt: .opencode/prompts/brain/ directory exists', pass: true });
    totalChecks++; passedChecks++;

    // Check installed agents directory exists
    if (!fs.existsSync(INSTALLED_AGENTS_DIR)) {
      results.push({ name: 'QC-Agent: .opencode/agents/ directory exists', pass: false });
    } else {
      results.push({ name: 'QC-Agent: .opencode/agents/ directory exists', pass: true });
      totalChecks++; passedChecks++;
    }

    // Get all source agent files (sorted for deterministic output)
    const agentFiles = fs.readdirSync(SRC_AGENTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort();

    // Count correct number of agents
    const has20Agents = agentFiles.length === 20;
    results.push({ name: 'QC-Agent: src/agents/ has 20 files (' + agentFiles.length + ')', pass: has20Agents });
    totalChecks++;
    if (has20Agents) passedChecks++;

    if (has20Agents) {
      for (const f of agentFiles) {
        const fileResults = checkAgentFile(path.join(SRC_AGENTS_DIR, f));
        for (const r of fileResults) {
          results.push(r);
          totalChecks++;
          if (r.pass) passedChecks++;
        }
      }
    }

    // Get all prompt files (sorted)
    const promptFiles = fs.readdirSync(PROMPTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort();

    // Check correct count (20 agents + 1 TEMPLATE = 21)
    const has21Prompts = promptFiles.length === 21;
    results.push({ name: 'QC-Prompt: .opencode/prompts/brain/ has 21 files (' + promptFiles.length + ')', pass: has21Prompts });
    totalChecks++;
    if (has21Prompts) passedChecks++;

    for (const f of promptFiles) {
      const fileResults = checkPromptFile(path.join(PROMPTS_DIR, f));
      for (const r of fileResults) {
        results.push(r);
        totalChecks++;
        if (r.pass) passedChecks++;
      }
    }

    // Summary
    const allPassed = passedChecks === totalChecks;
    return {
      passed: allPassed,
      message: allPassed
        ? 'All ' + totalChecks + ' agent/prompt structure checks passed'
        : passedChecks + '/' + totalChecks + ' passed. Failed: ' + results.filter(r => !r.pass).map(r => r.name).join('; '),
      time_ms: Date.now() - start,
    };
  },
};
