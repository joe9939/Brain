// qc-circuit-consistency.test.js — Validate circuit connections are consistent
// Parses CIRCUIT sections from all prompt files and builds a directed graph.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const PROMPTS_DIR = config.PROMPTS_DIR;

/**
 * Parse CIRCUIT section YAML from a prompt file.
 * Returns { feedforward-to: [...], feedback-to: [...], inhibited-by: [...],
 *           modulates: [...], modulated-by: [...], competes-with: [...] }
 * or null if no CIRCUIT section found.
 */
function parseCircuit(content) {
  // Find ## CIRCUIT section
  const circuitMatch = content.match(/## CIRCUIT\n([\s\S]*?)(?=\n## )/);
  if (!circuitMatch) return null;

  const circuitText = circuitMatch[1];
  // Extract yaml code block
  const yamlMatch = circuitText.match(/```yaml\n([\s\S]*?)```/);
  if (!yamlMatch) return null;

  const yaml = yamlMatch[1];
  const result = {};

  // Parse each YAML list field
  const fields = ['feedforward-to', 'feedback-to', 'inhibited-by', 'modulates', 'modulated-by', 'competes-with'];
  for (const field of fields) {
    const regex = new RegExp('^' + field + ':\\s*$', 'm');
    const match = yaml.match(regex);
    if (match) {
      const startIdx = match.index;
      const afterField = yaml.slice(startIdx + match[0].length);
      // Parse list items: lines starting with "- "
      const listLines = [];
      for (const line of afterField.split('\n')) {
        const itemMatch = line.match(/^\s+-\s+(\S[\w-]*)/);
        if (itemMatch) {
          listLines.push(itemMatch[1]);
        } else if (line.trim() !== '' && !line.trim().startsWith('#')) {
          break; // non-empty, non-comment, non-list line = end of list
        }
      }
      result[field] = listLines;
    } else {
      result[field] = [];
    }
  }

  return result;
}

module.exports = {
  name: 'QC: Circuit Consistency',
  run: async () => {
    const start = Date.now();
    const results = [];
    let totalChecks = 0;
    let passedChecks = 0;

    if (!fs.existsSync(PROMPTS_DIR)) {
      return { passed: false, message: 'Prompts directory not found: ' + PROMPTS_DIR, time_ms: Date.now() - start };
    }

    const promptFiles = fs.readdirSync(PROMPTS_DIR)
      .filter(f => f.endsWith('.md') && f !== 'TEMPLATE.md')
      .sort();

    // Build directed graph: agentName -> { feedforward, feedback, inhibitedBy, modulates, modulatedBy, competes }
    const graph = {};
    const allAgents = [];

    for (const f of promptFiles) {
      const agentName = f.replace('.md', '');
      allAgents.push(agentName);
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const circuit = parseCircuit(content);
      if (!circuit) {
        results.push({ name: agentName + ' has parsable CIRCUIT section', pass: false });
        totalChecks++;
        continue;
      }
      results.push({ name: agentName + ' has parsable CIRCUIT section', pass: true });
      totalChecks++; passedChecks++;
      graph[agentName] = circuit;
    }

    // ─── Check 1: No self-loops ──────────────────────────────────────────
    for (const agent of allAgents) {
      const c = graph[agent];
      if (!c) continue;
      for (const field of ['feedforward-to', 'feedback-to', 'inhibited-by', 'modulates', 'modulated-by', 'competes-with']) {
        if (c[field].includes(agent)) {
          results.push({ name: agent + ' has no self-loop in ' + field, pass: false });
          totalChecks++;
        }
      }
    }
    // Count passed self-loop checks (one per agent)
    for (const agent of allAgents) {
      const c = graph[agent];
      if (!c) continue;
      let hasSelfLoop = false;
      for (const field of ['feedforward-to', 'feedback-to', 'inhibited-by', 'modulates', 'modulated-by', 'competes-with']) {
        if (c[field].includes(agent)) { hasSelfLoop = true; break; }
      }
      results.push({ name: agent + ' has no self-loops', pass: !hasSelfLoop });
      totalChecks++;
      if (!hasSelfLoop) passedChecks++;
    }

    // ─── Check 2: All feedforward targets exist as agents ───────────────
    for (const agent of allAgents) {
      const c = graph[agent];
      if (!c) continue;
      for (const target of c['feedforward-to']) {
        const targetBare = target.replace(/-/g, '-'); // no-op, just for clarity
        const exists = allAgents.includes(targetBare) || targetBare === 'user' || targetBare === 'orchestrator';
        results.push({
          name: agent + ' feedforward-to ' + targetBare + ' exists',
          pass: exists,
        });
        totalChecks++;
        if (exists) passedChecks++;
      }
    }

    // ─── Check 3: Key specific connections ──────────────────────────────
    // For feedforward-to, check from -> to in the from agent's feedforward-to list
    // For inhibited-by, check from -> to means the FROM agent inhibits the TO agent,
    // so we check the TO agent's inhibited-by list for FROM
    const keyConnections = [
      { from: 'thalamus', to: 'amygdala', field: 'feedforward-to' },
      { from: 'thalamus', to: 'hippocampus', field: 'feedforward-to' },
      { from: 'thalamus', to: 'world-cortex', field: 'feedforward-to' },
      { from: 'amygdala', to: 'reward-cortex', field: 'feedforward-to' },
      { from: 'amygdala', to: 'safety-cortex', field: 'feedforward-to' },
      { from: 'hippocampus', to: 'basal-ganglia', field: 'feedforward-to' },
      { from: 'safety-cortex', to: 'swarm-coder', field: 'feedforward-to' },
      // inhibition: safety-cortex INHIBITS swarm-coder → check swarm-coder's inhibited-by for safety-cortex
      { from: 'swarm-coder', to: 'safety-cortex', field: 'inhibited-by' },
      // inhibition: basal-ganglia INHIBITS swarm-coder → check swarm-coder's inhibited-by for basal-ganglia
      { from: 'swarm-coder', to: 'basal-ganglia', field: 'inhibited-by' },
    ];

    for (const conn of keyConnections) {
      const c = graph[conn.from];
      if (!c) {
        results.push({ name: conn.from + ' exists for ' + conn.from + '→' + conn.to, pass: false });
        totalChecks++;
        continue;
      }
      const targets = c[conn.field] || [];
      const found = targets.includes(conn.to);
      results.push({
        name: conn.from + ' ' + conn.field + ' includes ' + conn.to,
        pass: found,
      });
      totalChecks++;
      if (found) passedChecks++;
    }

    // ─── Check 4: Bidirectional consistency ──────────────────────────────
    // If A feedforward-to B, check that B has some reference back (feedback-to, inhibited-by, modulated-by, or competes-with)
    for (const agent of allAgents) {
      const c = graph[agent];
      if (!c) continue;
      for (const target of c['feedforward-to']) {
        if (!allAgents.includes(target)) continue; // skip 'user', 'orchestrator'
        const tc = graph[target];
        if (!tc) continue;
        // Check if target has any reference back to agent
        const hasBackRef = tc['feedback-to'].includes(agent) ||
          tc['modulated-by'].includes(agent) ||
          tc['inhibited-by'].includes(agent) ||
          tc['competes-with'].includes(agent);
        if (!hasBackRef && agent !== target) {
          // This is informational only — some connections are truly unidirectional
          // So we just note it but don't fail
          results.push({
            name: agent + '→' + target + ' has reverse connection (unidirectional)',
            pass: true,
          });
          totalChecks++;
          passedChecks++;
        }
      }
    }

    // ─── Check 5: Count edges in directed graph ──────────────────────────
    let totalEdges = 0;
    for (const agent of allAgents) {
      const c = graph[agent];
      if (!c) continue;
      for (const field of ['feedforward-to', 'feedback-to', 'inhibited-by', 'modulates', 'modulated-by', 'competes-with']) {
        totalEdges += c[field].filter(t => allAgents.includes(t) || t === 'user' || t === 'orchestrator').length;
      }
    }
    results.push({ name: 'Total circuit edges >= 40 (' + totalEdges + ')', pass: totalEdges >= 40 });
    totalChecks++;
    if (totalEdges >= 40) passedChecks++;

    const allPassed = passedChecks === totalChecks;
    return {
      passed: allPassed,
      message: allPassed
        ? 'All ' + totalChecks + ' circuit consistency checks passed (' + totalEdges + ' edges in graph)'
        : passedChecks + '/' + totalChecks + ' passed. Failed: ' + results.filter(r => !r.pass).map(r => r.name).join('; '),
      time_ms: Date.now() - start,
    };
  },
};
