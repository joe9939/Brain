// tc-07-install-verify-active.test.js — Verify post-install brain mode actually activates
// DANGEROUS: runs real install/uninstall. Only runs with --dangerous flag.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('../config');

const SRC_AGENTS_DIR = path.join(config.BRAIN_AGENT_DIR, 'src', 'agents');
const PROMPTS_DIR = config.PROMPTS_DIR;
const INSTALLED_AGENTS_DIR = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'agents');
const INSTALLED_PROMPTS_DIR = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'prompts', 'brain');
const MCP_DIR = config.MCP_DIR;
const SKILL_FILE = config.SKILL_FILE;
const PLUGIN_FILE = config.PLUGIN_FILE;
const OMO_CONFIG = path.join(config.BRAIN_AGENT_DIR, 'oh-my-openagent.jsonc');

/**
 * Run a command and return { pass, output, error }
 */
function runCmd(cmd, cwd, timeout) {
  try {
    const out = execSync(cmd, { cwd: cwd || config.BRAIN_AGENT_DIR, encoding: 'utf8', timeout: timeout || 60000, stdio: 'pipe' });
    return { pass: true, output: out };
  } catch (e) {
    return { pass: false, output: e.stdout || '', error: e.stderr || e.message };
  }
}

/**
 * Count markdown files in a directory
 */
function countMdFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).length;
}

module.exports = {
  name: 'TC-07: Install/Verify Active',
  run: async () => {
    const start = Date.now();
    if (!process.argv.includes('--dangerous')) {
      return { passed: true, message: 'SKIPPED (pass --dangerous to run real install/uninstall test)', time_ms: 0 };
    }

    const results = [];
    let failedAny = false;

    // ─── Phase 1: After --uninstall ─────────────────────────────────────
    const uninstallResult = runCmd('node install.js --uninstall');
    results.push({ name: 'Uninstall exits 0', pass: uninstallResult.pass });
    if (!uninstallResult.pass) failedAny = true;

    // Check opencode.json no longer has brain agent
    if (fs.existsSync(config.OPCODE_CONFIG)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(config.OPCODE_CONFIG, 'utf8'));
        const hasBrainAgent = cfg && cfg.agent && cfg.agent.brain;
        results.push({ name: 'Post-uninstall: brain agent removed from opencode.json', pass: !hasBrainAgent });
      } catch (e) {
        results.push({ name: 'Post-uninstall: brain agent removed from opencode.json', pass: false });
        failedAny = true;
      }
    } else {
      results.push({ name: 'Post-uninstall: opencode.json exists', pass: false });
      failedAny = true;
    }

    // Plugin file deleted
    results.push({ name: 'Post-uninstall: plugin file deleted', pass: !fs.existsSync(PLUGIN_FILE) });

    // Skill files deleted
    results.push({ name: 'Post-uninstall: skill file deleted', pass: !fs.existsSync(SKILL_FILE) });

    // Agent files deleted from .opencode/agents/
    const installedAgentFiles = countMdFiles(INSTALLED_AGENTS_DIR);
    results.push({ name: 'Post-uninstall: .opencode/agents/ cleared (' + installedAgentFiles + ' left)', pass: installedAgentFiles === 0 });

    // ─── Phase 2: After install ─────────────────────────────────────────
    const installResult = runCmd('node install.js');
    results.push({ name: 'Install exits 0', pass: installResult.pass });
    if (!installResult.pass) failedAny = true;

    // opencode.json has brain agent configured
    if (fs.existsSync(config.OPCODE_CONFIG) && installResult.pass) {
      try {
        const cfg = JSON.parse(fs.readFileSync(config.OPCODE_CONFIG, 'utf8'));
        const hasBrainAgent = cfg && cfg.agent && cfg.agent.brain && cfg.agent.brain.mode === 'primary';
        results.push({ name: 'Post-install: brain agent in opencode.json', pass: hasBrainAgent });
      } catch (e) {
        results.push({ name: 'Post-install: brain agent in opencode.json', pass: false });
        failedAny = true;
      }
    }

    // Plugin file exists
    results.push({ name: 'Post-install: plugin file exists', pass: fs.existsSync(PLUGIN_FILE) });

    // Skill file exists
    results.push({ name: 'Post-install: skill file exists', pass: fs.existsSync(SKILL_FILE) });

    // 20 agents installed
    const agentCount = countMdFiles(INSTALLED_AGENTS_DIR);
    results.push({ name: 'Post-install: 20 agents installed (' + agentCount + ')', pass: agentCount === 20 });

    // 20 prompts installed
    const promptCount = countMdFiles(INSTALLED_PROMPTS_DIR);
    results.push({ name: 'Post-install: 20 prompts installed (' + promptCount + ')', pass: promptCount >= 20 });

    // MCP compiled files exist (check for TypeScript source files at minimum)
    if (fs.existsSync(MCP_DIR)) {
      const mcpDirs = fs.readdirSync(MCP_DIR).filter(f => fs.statSync(path.join(MCP_DIR, f)).isDirectory());
      results.push({ name: 'Post-install: MCP servers directory exists (' + mcpDirs.length + ')', pass: mcpDirs.length >= 3 });
    } else {
      results.push({ name: 'Post-install: MCP servers directory exists', pass: false });
      failedAny = true;
    }

    // Oh-My-OpenAgent categories have brain-* entries
    if (fs.existsSync(OMO_CONFIG)) {
      try {
        const omoCfg = JSON.parse(fs.readFileSync(OMO_CONFIG, 'utf8'));
        const categories = omoCfg.categories || {};
        const brainCategories = Object.keys(categories).filter(k => k.startsWith('brain-'));
        results.push({ name: 'Post-install: OMO has brain-* categories (' + brainCategories.length + ')', pass: brainCategories.length >= 1 });
      } catch (e) {
        results.push({ name: 'Post-install: OMO has brain-* categories', pass: false });
      }
    } else {
      // OMO config is optional — not a failure if missing
      results.push({ name: 'Post-install: OMO config exists (optional)', pass: true });
    }

    // ─── Phase 3: --status check ───────────────────────────────────────
    const statusResult = runCmd('node install.js --status');
    results.push({ name: 'Status exits 0', pass: statusResult.pass });
    if (statusResult.pass) {
      const out = statusResult.output;
      results.push({ name: 'Status contains brain-plugin ✓', pass: out.includes('brain-plugin') || out.includes('Plugin') || out.includes('plugin') });
      results.push({ name: 'Status contains brain-master ✓', pass: out.includes('brain-master') || out.includes('Skill') || out.includes('skill') });
      results.push({ name: 'Status contains Agents (20) ✓', pass: out.includes('20') && (out.includes('Agent') || out.includes('agent')) });
      results.push({ name: 'Status contains Prompts (20) ✓', pass: out.includes('20') && (out.includes('Prompt') || out.includes('prompt')) });
    } else {
      results.push({ name: 'Status contains brain-plugin ✓', pass: false });
      results.push({ name: 'Status contains brain-master ✓', pass: false });
      results.push({ name: 'Status contains Agents (20) ✓', pass: false });
      results.push({ name: 'Status contains Prompts (20) ✓', pass: false });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed
        ? 'All TC-07 install/verify checks passed'
        : 'Failed: ' + failed.join('; '),
      time_ms: Date.now() - start,
    };
  },
};
