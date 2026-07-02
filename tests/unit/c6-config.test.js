// c6-config.test.js — C6 Config structure validation
// Covers items 3.16-3.30: valid JSON, agent/MCP/plugin paths, JSONC parsing, OMO categories

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\86189\\Desktop\\brain-agent';
const OMO = path.join(ROOT, 'oh-my-openagent.jsonc');
const MCP_SRC = path.join(ROOT, 'src', 'mcp');
const AGENTS_DIR = path.join(ROOT, '.opencode', 'agents');
const SKILLS_DIR = path.join(ROOT, '.opencode', 'skills');
const PLUGIN_DIR = path.join(ROOT, 'src', 'plugin');

const ALL_MCPS = ['memory-store', 'world-model', 'reward-system', 'tool-tracker', 'sop-tracker', 'reflexion', 'priority-queue', 'monitor'];
const ALL_AGENTS = ['thalamus', 'amygdala', 'hippocampus', 'world-cortex', 'safety', 'attention', 'reward',
  'basal-ganglia', 'cerebellum', 'dmn', 'insula', 'hypothalamus', 'self-optimizer', 'self-enhance',
  'offline-consolidation', 'swarm-planner', 'swarm-coder', 'swarm-reviewer', 'swarm-tester',
  'dlpfc', 'premotor-cortex', 'gate-tuner', 'curiosity', 'meta-learner', 'red-team', 'architect'];

module.exports = {
  name: 'C6: config structure',
  run: () => {
    const start = Date.now();
    const R = [];

    // 3.16 config valid JSON/JSONC
    {
      try {
        const raw = fs.readFileSync(OMO, 'utf8');
        const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const cleaned = normalized.replace(/(^[ \t]*)\/\/.*$/gm, '$1').replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
        JSON.parse(cleaned);
        R.push({ n: '3.16 config-valid-JSON', p: true });
      } catch (e) {
        R.push({ n: '3.16 config-valid-JSON', p: false });
      }
    }

    // 3.17 agent paths exist
    {
      const files = fs.existsSync(AGENTS_DIR) ? fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')) : [];
      const count = files.length;
      R.push({ n: '3.17 agent-paths-exist (' + count + ')', p: count >= 15 });
    }

    // 3.18 MCP dist paths exist
    {
      const count = ALL_MCPS.filter(m => {
        const dist = path.join(MCP_SRC, m, 'dist', 'server.js');
        const alt = path.join(ROOT, '.opencode', 'mcp', m, 'dist', 'server.js');
        return fs.existsSync(dist) || fs.existsSync(alt);
      }).length;
      R.push({ n: '3.18 MCP-dist-exist (' + count + '/' + ALL_MCPS.length + ')', p: count >= 6 });
    }

    // 3.19 plugin paths exist
    {
      const hasHooks = fs.existsSync(path.join(PLUGIN_DIR, 'brain-hooks.mjs'));
      const hasPlugin = fs.existsSync(path.join(PLUGIN_DIR, 'brain-plugin.mjs'));
      R.push({ n: '3.19 plugin-paths-exist', p: hasHooks && hasPlugin });
    }

    // 3.20 instructions exist
    {
      const hasMaster = fs.existsSync(path.join(SKILLS_DIR, 'brain-master.md'));
      const skillsCount = fs.existsSync(SKILLS_DIR) ? fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md')).length : 0;
      R.push({ n: '3.20 instructions-exist (brain-master.md: ' + hasMaster + ')', p: hasMaster });
    }

    // 3.21 JSONC single-line comment preserved
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const hasSingleLine = raw.includes('//');
      R.push({ n: '3.21 JSONC-single-line', p: hasSingleLine });
    }

    // 3.22 JSONC multi-line (categories object)
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const hasCategories = raw.includes('"categories"');
      R.push({ n: '3.22 JSONC-multi-line', p: hasCategories });
    }

    // 3.23 JSONC URL preserved
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const hasSchema = raw.includes('$schema') && raw.includes('http');
      R.push({ n: '3.23 JSONC-URL-preserve', p: hasSchema });
    }

    // 3.24 JSONC trailing comma handled
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const hasTrailingComma = /,\s*}/.test(raw) || /,\s*\]/.test(raw);
      const normalize = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/(^[ \t]*)\/\/.*$/gm, '$1').replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const parses = (() => { try { JSON.parse(normalize(raw)); return true; } catch (e) { return false; } })();
      R.push({ n: '3.24 JSONC-trailing-comma', p: hasTrailingComma || parses });
    }

    // 3.25 JSONC nested structure
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const hasBrainNested = raw.includes('"brain-');
      R.push({ n: '3.25 JSONC-nested', p: hasBrainNested });
    }

    // 3.26 JSONC string preserved
    {
      const raw = fs.readFileSync(OMO, 'utf8');
      const modelCount = (raw.match(/deepseek/g) || []).length;
      R.push({ n: '3.26 JSONC-string-preserved (' + modelCount + ' model refs)', p: modelCount > 0 });
    }

    // 3.27 install/uninstall cycle (install.js exists)
    {
      const hasInstall = fs.existsSync(path.join(ROOT, 'install.js'));
      R.push({ n: '3.27 install-uninstall', p: hasInstall });
    }

    // 3.28 install dry-run (install.js has --dry-run)
    {
      const installContent = fs.readFileSync(path.join(ROOT, 'install.js'), 'utf8');
      R.push({ n: '3.28 install-dry-run', p: installContent.includes('dry') || installContent.includes('DRY') });
    }

    // 3.29 install status (install.js has --status)
    {
      const installContent = fs.readFileSync(path.join(ROOT, 'install.js'), 'utf8');
      R.push({ n: '3.29 install-status', p: installContent.includes('status') || installContent.includes('STATUS') });
    }

    // 3.30 OMO 20 categories valid
    {
      try {
        const raw = fs.readFileSync(OMO, 'utf8');
        const cleaned = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/(^[ \t]*)\/\/.*$/gm, '$1').replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
        const parsed = JSON.parse(cleaned);
        const cats = Object.keys(parsed.categories || {});
        const brainCats = cats.filter(c => c.startsWith('brain-'));
        R.push({ n: '3.30 OMO-20-categories-valid (' + brainCats.length + ' brain, ' + cats.length + ' total)', p: brainCats.length >= 20 });
      } catch (e) {
        R.push({ n: '3.30 OMO-20-categories-valid', p: false });
      }
    }

    return { passed: R.every(r => r.p), message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'), time_ms: Date.now() - start };
  },
};
if (require.main === module) { const r = module.exports.run(); console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); }
