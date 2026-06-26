#!/usr/bin/env node
// brain-agent — install, uninstall, status, verify
// Usage: node install.js [command]
// Commands:
//   (no args)   Install brain-agent
//   --status    Health check
//   --dry-run   Verify all files without modifying config
//   --uninstall Remove brain-agent and restore originals
//   --version   Show version

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.config', 'opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'opencode.json');
const PROJECT = process.cwd();
const HERE = __dirname;
const BRAIN_VERSION = '1.0.0';

// --- version command (early exit) ---
if (process.argv.includes('--version')) {
  console.log('brain-agent v' + BRAIN_VERSION);
  process.exit(0);
}

const CYAN = '\x1b[36m'; const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m'; const RED = '\x1b[31m'; const RESET = '\x1b[0m';
function ok(msg) { console.log('  ' + GREEN + '\u2713' + RESET + ' ' + msg); }
function warn(msg) { console.log('  ' + YELLOW + '\u26A0' + RESET + ' ' + msg); }

// JSONC comment stripper — state-machine handles // inside URLs (e.g. https://)
function stripJsoncComments(text) {
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1] || '';
    if (inString) {
      result += c;
      if (c === '\\' && (next === '"' || next === '\\' || next === '/' || next === 'n' || next === 't')) {
        result += next; i += 2; continue;
      }
      if (c === stringChar) inString = false;
      i++; continue;
    }
    if (c === '"') { inString = true; stringChar = c; result += c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      if (i < text.length) result += '\n';
      i++; continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
      i += 2; continue;
    }
    result += c; i++;
  }
  return result;
}

// --- status command ---
if (process.argv.includes('--status')) {
  console.log('\n' + CYAN + 'Brain Agent Status' + RESET + '\n');
  const checks = [];

  // Plugin
  checks.push({ name: 'Plugin', ok: fs.existsSync(path.join(CONFIG_DIR,'plugins','brain-plugin.mjs')) });
  // Skills
  checks.push({ name: 'Skills', ok: fs.existsSync(path.join(PROJECT,'.opencode','skills','brain-master.md')) });
  // Agents
  const agentDir = path.join(PROJECT,'.opencode','agents');
  const agentCount = fs.existsSync(agentDir) ? fs.readdirSync(agentDir).length : 0;
  checks.push({ name: 'Agents (' + agentCount + ')', ok: agentCount >= 3 });
  // Command
  checks.push({ name: 'Command', ok: fs.existsSync(path.join(CONFIG_DIR,'command','brain.md')) });
  // Config
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));
    const hasBrain = cfg.agent?.brain?.mode === 'primary';
    const hasMcp = cfg.mcp?.['memory-store']?.enabled;
    checks.push({ name: 'Config: brain agent', ok: hasBrain });
    checks.push({ name: 'Config: MCP servers', ok: hasMcp });
  }
  // MCP compiled
  const mcpBase = path.join(PROJECT,'.opencode','mcp');
  checks.push({ name: 'memory-mcp', ok: fs.existsSync(path.join(mcpBase,'memory-store','dist','server.js')) });
  checks.push({ name: 'world-model', ok: fs.existsSync(path.join(mcpBase,'world-model','dist','server.js')) });
  checks.push({ name: 'reward-system', ok: fs.existsSync(path.join(mcpBase,'reward-system','dist','server.js')) });
  // Oh-My-OpenAgent categories
  const ohmFile = path.join(CONFIG_DIR, 'oh-my-openagent.json');
  const hasBrainCategory = fs.existsSync(ohmFile)
    ? JSON.parse(fs.readFileSync(ohmFile,'utf8')).categories?.['brain-thalamus'] !== undefined
    : false;
  checks.push({ name: 'Oh-My-OpenAgent brain categories', ok: hasBrainCategory });
  // Prompt files
  const promptDir = path.join(CONFIG_DIR, 'prompts', 'brain');
  const promptCount = fs.existsSync(promptDir) ? fs.readdirSync(promptDir).length : 0;
  checks.push({ name: 'Prompts (' + promptCount + ')', ok: promptCount >= 20 });
  // team_mode
  const hasTeamMode = fs.existsSync(ohmFile)
    ? JSON.parse(fs.readFileSync(ohmFile,'utf8')).team_mode?.enabled === true
    : false;
  checks.push({ name: 'Team mode (swarm)', ok: hasTeamMode });
  // ulw-loop command
  const cmdDir = path.join(CONFIG_DIR, 'command');
  const hasUlw = fs.existsSync(cmdDir)
    ? fs.readdirSync(cmdDir).some(f => f.includes('ulw') || f.includes('consolidation'))
    : false;
  checks.push({ name: 'ulw-loop command', ok: hasUlw });

  for (const c of checks) {
    console.log('  ' + (c.ok ? GREEN + '\u2713' + RESET : RED + '\u2717' + RESET) + ' ' + c.name);
  }
  const allOk = checks.every(c => c.ok);
  console.log('\n  Status: ' + (allOk ? GREEN + 'ALL GOOD' + RESET : YELLOW + 'NEEDS SETUP' + RESET) + '\n');
  process.exit(allOk ? 0 : 1);
}

// --- dry-run / verify mode ---
if (process.argv.includes('--dry-run') || process.argv.includes('--verify')) {
  console.log('\n' + CYAN + 'Brain Agent — Dry Run / Verification' + RESET + '\n');
  let allOk = true;
  const checks = [
    { name: 'Plugin source', ok: fs.existsSync(path.join(HERE, 'src', 'plugin', 'brain-plugin.mjs')) },
    { name: 'Skill source', ok: fs.existsSync(path.join(HERE, 'src', 'skills', 'brain-master.md')) },
    { name: 'Agent sources (20)', ok: fs.readdirSync(path.join(HERE, 'src', 'agents')).filter(f => f.endsWith('.md')).length === 20 },
    { name: 'Command source', ok: fs.existsSync(path.join(HERE, 'src', 'commands', 'brain.md')) },
    { name: 'ulw-loop command source', ok: fs.existsSync(path.join(HERE, 'src', 'commands', 'ulw-loop.md')) },
    { name: 'Config template', ok: fs.existsSync(path.join(HERE, 'config', 'opencode.example.json')) },
    { name: 'oh-my-openagent.jsonc', ok: fs.existsSync(path.join(HERE, 'oh-my-openagent.jsonc')) },
    { name: 'Prompt files (20)', ok: fs.readdirSync(path.join(HERE, '.opencode', 'prompts', 'brain')).filter(f => f.endsWith('.md')).length === 20 },
  ];
  // Validate JSONC parsing (uses state-machine comment stripper)
  const ohmSrc = path.join(HERE, 'oh-my-openagent.jsonc');
  if (fs.existsSync(ohmSrc)) {
    try {
      const raw = fs.readFileSync(ohmSrc, 'utf8');
      const clean = stripJsoncComments(raw);
      const parsed = JSON.parse(clean);
      const catCount = Object.keys(parsed.categories || {}).length;
      checks.push({ name: 'Categories parsed (' + catCount + ')', ok: catCount === 20 });
      checks.push({ name: 'team_mode enabled', ok: parsed.team_mode?.enabled === true });
      checks.push({ name: 'ulw-loop agent', ok: parsed.commands?.['ulw-loop']?.agent === 'brain-consolidation' });
    } catch (e) {
      checks.push({ name: 'JSONC parse', ok: false });
    }
  }
  // Validate brain-master.md has category references
  const masterPath = path.join(HERE, 'src', 'skills', 'brain-master.md');
  if (fs.existsSync(masterPath)) {
    const master = fs.readFileSync(masterPath, 'utf8');
    checks.push({ name: 'brain-master: category delegation', ok: master.includes('category=') });
    checks.push({ name: 'brain-master: run_in_background', ok: master.includes('run_in_background=') });
    checks.push({ name: 'brain-master: ulw-loop ref', ok: master.includes('ulw-loop') });
    checks.push({ name: 'brain-master: team_mode ref', ok: master.includes('team_mode') || master.includes('TEAM MODE') });
  }
  for (const c of checks) {
    console.log('  ' + (c.ok ? GREEN + '\u2713' + RESET : RED + '\u2717' + RESET) + ' ' + c.name);
    if (!c.ok) allOk = false;
  }
  console.log('\n  ' + (allOk ? GREEN + 'ALL CHECKS PASSED' : RED + 'SOME CHECKS FAILED') + RESET);
  if (allOk) {
    console.log(YELLOW + '  Run `node install.js` to apply.' + RESET);
  }
  process.exit(allOk ? 0 : 1);
}

// --- uninstall / cleanup mode ---
if (process.argv.includes('--uninstall') || process.argv.includes('--cleanup')) {
  console.log('\n' + CYAN + 'Brain Agent — Uninstall' + RESET + '\n');
  const removed = [];

  // Helper: safe delete
  function rm(p) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) { fs.rmSync(p, { recursive: true, force: true }); }
      else { fs.unlinkSync(p); }
      return true;
    }
    return false;
  }

  // 1. Restore opencode.json backup
  const backupCfg = CONFIG_FILE + '.brain-backup';
  if (fs.existsSync(backupCfg)) {
    fs.copyFileSync(backupCfg, CONFIG_FILE);
    removed.push('Config restored from backup');
  } else {
    // Remove brain-agent entries from current config
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        let changed = false;
        if (cfg.agent) {
          for (const key of Object.keys(cfg.agent)) {
            if (key === 'brain' || cfg.agent[key].mode === 'subagent') {
              delete cfg.agent[key]; changed = true;
            }
          }
        }
        if (cfg.mcp) {
          for (const key of ['memory-store', 'world-model', 'reward-system']) {
            if (cfg.mcp[key]) { delete cfg.mcp[key]; changed = true; }
          }
        }
        if (cfg.plugin) {
          cfg.plugin = cfg.plugin.filter(p => !p.includes('brain-plugin'));
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
          removed.push('Brain-agent entries removed from opencode.json');
        }
      } catch(e) { warn('Could not modify config: ' + e.message); }
    }
  }

  // 2. Restore oh-my-openagent.json backup
  const ohmFile = path.join(CONFIG_DIR, 'oh-my-openagent.json');
  const ohmBackup = ohmFile + '.brain-backup';
  if (fs.existsSync(ohmBackup)) {
    fs.copyFileSync(ohmBackup, ohmFile);
    removed.push('Oh-My-OpenAgent config restored from backup');
  } else if (fs.existsSync(ohmFile)) {
    // Remove brain-* categories from config
    try {
      const omo = JSON.parse(fs.readFileSync(ohmFile, 'utf8'));
      let changed = false;
      if (omo.categories) {
        for (const key of Object.keys(omo.categories)) {
          if (key.startsWith('brain-')) { delete omo.categories[key]; changed = true; }
        }
      }
      if (omo.team_mode?.lead?.startsWith('brain-')) { delete omo.team_mode; changed = true; }
      if (omo.commands?.['ulw-loop']) { delete omo.commands['ulw-loop']; changed = true; }
      if (changed) {
        fs.writeFileSync(ohmFile, JSON.stringify(omo, null, 2));
        removed.push('Brain categories removed from oh-my-openagent.json');
      }
    } catch(e) { warn('Could not modify oh-my-openagent.json: ' + e.message); }
  }

  // 3. Remove plugin
  if (rm(path.join(CONFIG_DIR, 'plugins', 'brain-plugin.mjs'))) removed.push('Plugin removed');

  // 4. Remove skills
  if (rm(path.join(PROJECT, '.opencode', 'skills', 'brain-master.md'))) removed.push('Skill removed');

  // 5. Remove agents
  const agentDir = path.join(PROJECT, '.opencode', 'agents');
  if (fs.existsSync(agentDir)) {
    let count = 0;
    for (const f of fs.readdirSync(agentDir)) {
      if (f.endsWith('.md')) { rm(path.join(agentDir, f)); count++; }
    }
    if (count > 0) removed.push(count + ' agent files removed');
    // Remove empty dir
    try { fs.rmdirSync(agentDir); } catch(e) {}
  }

  // 6. Remove commands
  if (rm(path.join(CONFIG_DIR, 'command', 'brain.md'))) removed.push('brain command removed');
  if (rm(path.join(CONFIG_DIR, 'command', 'ulw-loop.md'))) removed.push('ulw-loop command removed');

  // 7. Remove prompt directory
  const promptDir = path.join(CONFIG_DIR, 'prompts', 'brain');
  if (rm(promptDir)) removed.push('Prompt files removed');
  // Clean up empty prompts parent
  try { fs.rmdirSync(path.join(CONFIG_DIR, 'prompts')); } catch(e) {}

  // 8. Remove MCP compiled files
  const mcpBase = path.join(PROJECT, '.opencode', 'mcp');
  for (const mcp of ['memory-store', 'world-model', 'reward-system']) {
    if (rm(path.join(mcpBase, mcp, 'dist', 'server.js'))) removed.push(mcp + ' MCP removed');
  }

  for (const r of removed) ok(r);
  if (removed.length === 0) warn('Nothing to remove — brain-agent was not installed');
  console.log('\n' + GREEN + 'Brain Agent uninstalled.' + RESET);
  console.log(YELLOW + 'Restart OpenCode to apply changes.' + RESET + '\n');
  process.exit(0);
}

// --- install ---
console.log('\n' + CYAN + 'Brain Agent v' + BRAIN_VERSION + ' - Installing...' + RESET + '\n');

const steps = [];

// 0. Check Oh My OpenCode dependency
const OMO_CONFIG_FILE = path.join(CONFIG_DIR, 'oh-my-openagent.json');
const OMO_INSTALLED = fs.existsSync(OMO_CONFIG_FILE);
if (!OMO_INSTALLED) {
  warn('Oh My OpenCode not found — categories, team_mode, and ulw-loop require it');
  warn('Install: npm install -g oh-my-opencode  (https://github.com/code-yeongyu/oh-my-opencode)');
  console.log('');
}

// 1. Plugin
fs.mkdirSync(path.join(CONFIG_DIR, 'plugins'), {recursive:true});
const pluginSrc = path.join(HERE, 'src', 'plugin', 'brain-plugin.mjs');
const pluginDst = path.join(CONFIG_DIR, 'plugins', 'brain-plugin.mjs');
fs.copyFileSync(pluginSrc, pluginDst);
steps.push('Plugin');

// 2. Skills
fs.mkdirSync(path.join(PROJECT, '.opencode', 'skills'), {recursive:true});
fs.copyFileSync(path.join(HERE,'src','skills','brain-master.md'), path.join(PROJECT,'.opencode','skills','brain-master.md'));
steps.push('Skills');

// 3. Agents
const agentSrc = path.join(HERE, 'src', 'agents');
const agentDst = path.join(PROJECT, '.opencode', 'agents');
fs.mkdirSync(agentDst, {recursive:true});
if (fs.existsSync(agentSrc)) {
  for (const a of fs.readdirSync(agentSrc)) {
    fs.copyFileSync(path.join(agentSrc, a), path.join(agentDst, a));
  }
}
steps.push('Agents (' + (fs.existsSync(agentSrc) ? fs.readdirSync(agentSrc).length : 0) + ')');

// 4. Command
fs.mkdirSync(path.join(CONFIG_DIR, 'command'), {recursive:true});
fs.copyFileSync(path.join(HERE,'src','commands','brain.md'), path.join(CONFIG_DIR,'command','brain.md'));
steps.push('Command');

// 5. Config merge
const examplePath = path.join(HERE, 'config', 'opencode.example.json');
if (fs.existsSync(examplePath)) {
  let config = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try { config = JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')); } catch(e) {}
  }
  // Replace template placeholders with actual installation paths
  let exampleStr = fs.readFileSync(examplePath, 'utf8');
  const mcpDir = path.join(PROJECT, '.opencode', 'mcp').replace(/\\/g, '/');
  const projectDir = PROJECT.replace(/\\/g, '/');
  const configDir = CONFIG_DIR.replace(/\\/g, '/');
  const pluginDir = path.join(CONFIG_DIR, 'plugins').replace(/\\/g, '/');
  exampleStr = exampleStr
    .replace(/\{MCP_DIR\}/g, mcpDir)
    .replace(/\{PROJECT_DIR\}/g, projectDir)
    .replace(/\{CONFIG_DIR\}/g, configDir)
    .replace(/\{PLUGIN_DIR\}/g, pluginDir);
  const example = JSON.parse(exampleStr);

  // Merge agent section
  config.agent = {...(config.agent||{}), ...(example.agent||{})};

  // Merge MCP section
  config.mcp = {...(config.mcp||{}), ...(example.mcp||{})};

  // Add plugin
  if (!config.plugin) config.plugin = [];
  const pluginPath = 'file:///' + pluginDst.replace(/\\/g,'/');
  if (!config.plugin.includes(pluginPath) && !config.plugin.includes('./plugins/brain-plugin.mjs')) {
    config.plugin.push(pluginPath);
  }

  // Preserve existing fields
  config['$schema'] = config['$schema'] || 'https://opencode.ai/config.json';
  config.instructions = config.instructions || example.instructions;
  config.default_agent = config.default_agent || 'build';
  config.permission = config.permission || example.permission;

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  steps.push('Config (merged)');
}

// 6. Oh-My-OpenAgent categories merge
const OMO_FILE = path.join(CONFIG_DIR, 'oh-my-openagent.json');
const BRAIN_OMO_SRC = path.join(HERE, 'oh-my-openagent.jsonc');
if (fs.existsSync(BRAIN_OMO_SRC)) {
  let omoConfig = {};
  if (fs.existsSync(OMO_FILE)) {
    try { omoConfig = JSON.parse(fs.readFileSync(OMO_FILE, 'utf8')); } catch(e) {}
  }
  const brainOmoRaw = fs.readFileSync(BRAIN_OMO_SRC, 'utf8');
  const brainOmo = JSON.parse(stripJsoncComments(brainOmoRaw));

  // Merge categories (brain-region categories only, preserve existing omo categories)
  omoConfig.categories = { ...(omoConfig.categories || {}), ...(brainOmo.categories || {}) };
  omoConfig.team_mode = { ...(omoConfig.team_mode || {}), ...(brainOmo.team_mode || {}) };

  // Add commands section
  omoConfig.commands = { ...(omoConfig.commands || {}), ...(brainOmo.commands || {}) };

  fs.writeFileSync(OMO_FILE, JSON.stringify(omoConfig, null, 2));
  steps.push('Oh-My-OpenAgent categories (20 brain regions)');
} else {
  warn('oh-my-openagent.jsonc not found — skipping Oh-My-OpenAgent setup');
}

// 7. Prompt files
const promptSrc = path.join(HERE, '.opencode', 'prompts', 'brain');
const promptDst = path.join(CONFIG_DIR, 'prompts', 'brain');
if (fs.existsSync(promptSrc)) {
  fs.mkdirSync(promptDst, { recursive: true });
  let count = 0;
  for (const p of fs.readdirSync(promptSrc)) {
    if (p.endsWith('.md')) {
      fs.copyFileSync(path.join(promptSrc, p), path.join(promptDst, p));
      count++;
    }
  }
  steps.push('Prompts (' + count + ' brain region prompts)');
} else {
  warn('prompt source not found — skipping prompt setup');
}

// 8. MCP servers (copy pre-compiled dist files)
const MCP_NAMES = ['memory-store', 'world-model', 'reward-system'];
const mcpSrcBase = path.join(HERE, 'src', 'mcp');
const mcpDstBase = path.join(PROJECT, '.opencode', 'mcp');
let mcpCount = 0;
for (const name of MCP_NAMES) {
  const srcFile = path.join(mcpSrcBase, name, 'dist', 'server.js');
  const dstFile = path.join(mcpDstBase, name, 'dist', 'server.js');
  if (fs.existsSync(srcFile)) {
    fs.mkdirSync(path.dirname(dstFile), { recursive: true });
    fs.copyFileSync(srcFile, dstFile);
    mcpCount++;
  } else {
    warn('MCP dist not found: ' + name + ' — skipping');
  }
}
steps.push('MCP servers (' + mcpCount + '/' + MCP_NAMES.length + ')');

// 9. ulw-loop command registration
const ulwLoopSrc = path.join(HERE, 'src', 'commands', 'ulw-loop.md');
if (fs.existsSync(ulwLoopSrc)) {
  fs.mkdirSync(path.join(CONFIG_DIR, 'command'), { recursive: true });
  fs.copyFileSync(ulwLoopSrc, path.join(CONFIG_DIR, 'command', 'ulw-loop.md'));
  steps.push('ulw-loop command (offline-consolidation)');
} else {
  warn('ulw-loop.md not found — skipping ulw-loop command setup');
}

for (const s of steps) ok(s);

console.log('\n' + GREEN + 'Brain Agent installed!' + RESET);
console.log(YELLOW + 'Restart OpenCode. Press Tab -> [brain].' + RESET);
console.log(CYAN + "Run 'node install.js --status' for health check." + RESET + '\n');
