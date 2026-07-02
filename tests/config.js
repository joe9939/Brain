// config.js — Shared test configuration for brain-agent test framework
const path = require('path');
const os = require('os');

const BRAIN_AGENT_DIR = path.resolve(__dirname, '..');
const HOME_DIR = os.homedir();

module.exports = {
  BRAIN_AGENT_DIR: BRAIN_AGENT_DIR,
  INSTALL_SCRIPT: path.join(BRAIN_AGENT_DIR, 'install.js'),
  SKILL_FILE: path.join(BRAIN_AGENT_DIR, '.opencode', 'skills', 'brain-master.md'),
  PLUGIN_FILE: path.join(BRAIN_AGENT_DIR, 'src', 'plugin', 'brain-plugin.mjs'),
  OPCODE_CONFIG: path.join(HOME_DIR, '.config', 'opencode', 'opencode.json'),
  BACKUP_DIR: path.join(BRAIN_AGENT_DIR, '.opencode', 'backups'),
  BENCHMARKS_DIR: path.join(BRAIN_AGENT_DIR, 'benchmarks'),
  TASKS_FILE: path.join(BRAIN_AGENT_DIR, 'benchmarks', 'tasks.json'),
  AGENTS_DIR: path.join(BRAIN_AGENT_DIR, '.opencode', 'agents'),
  MCP_DIR: path.join(BRAIN_AGENT_DIR, 'src', 'mcp'),
  PROMPTS_DIR: path.join(BRAIN_AGENT_DIR, '.opencode', 'prompts', 'brain'),
};
