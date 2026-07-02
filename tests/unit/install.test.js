// install.test.js — Test install.js logic WITHOUT running real install
const fs = require('fs');
const path = require('path');
const config = require('../config');

const INSTALL_PATH = config.INSTALL_SCRIPT;
const EXAMPLE_CONFIG = require('path').join(config.BRAIN_AGENT_DIR, 'config', 'opencode.example.json');

module.exports = {
  name: 'Install Logic',
  run: async () => {
    const start = Date.now();
    const results = [];

    // 1. install.js exists and is readable
    const exists = fs.existsSync(INSTALL_PATH);
    results.push({ name: 'install.js exists', pass: exists });

    if (!exists) {
      return { passed: false, message: 'install.js not found at ' + INSTALL_PATH, time_ms: Date.now() - start };
    }

    const content = fs.readFileSync(INSTALL_PATH, 'utf8');

    // 2. Placeholder replacement logic: check example config template has placeholders
    //    and install.js has the replace() calls for them
    if (fs.existsSync(EXAMPLE_CONFIG)) {
      const exampleContent = fs.readFileSync(EXAMPLE_CONFIG, 'utf8');
      results.push({ name: 'Config template has {MCP_DIR}', pass: exampleContent.includes('{MCP_DIR}') });
      results.push({ name: 'Config template has {HERE_DIR}', pass: exampleContent.includes('{HERE_DIR}') || exampleContent.includes('{PROJECT_DIR}') });
      results.push({ name: 'Config template has {CONFIG_DIR}', pass: exampleContent.includes('{CONFIG_DIR}') });
      results.push({ name: 'Config template has {PLUGIN_DIR}', pass: exampleContent.includes('{PLUGIN_DIR}') });
    } else {
      // Fallback: check install.js has the replacement patterns
      results.push({ name: 'Has {MCP_DIR} pattern', pass: content.includes('MCP_DIR') });
      results.push({ name: 'Has {PROJECT_DIR} pattern', pass: content.includes('PROJECT_DIR') });
      results.push({ name: 'Has {CONFIG_DIR} pattern', pass: content.includes('CONFIG_DIR') });
      results.push({ name: 'Has {PLUGIN_DIR} pattern', pass: content.includes('PLUGIN_DIR') });
    }

    // 3. Replacements use .replace() calls
    results.push({ name: 'Replacement uses .replace()', pass: content.includes('.replace(') });

    // 4. Dry-run mode: --dry-run or --verify flag
    results.push({ name: 'Dry-run mode supported', pass: content.includes('--dry-run') || content.includes('--verify') });

    // 5. Status check has 12+ checks (team_mode disabled expected, so some may fail)
    const checkCount = (content.match(/{ name:/g) || []).length;
    results.push({ name: 'Status checks >= 12', pass: checkCount >= 12 });

    // 6. team_mode check exists
    results.push({ name: 'team_mode status check exists', pass: content.includes('team_mode') });

    // 7. Uninstall support
    results.push({ name: 'Uninstall mode supported', pass: content.includes('--uninstall') });

    // 8. Brain version defined
    const versionMatch = content.match(/BRAIN_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
    results.push({ name: 'Version defined', pass: !!versionMatch });

    // 9. stripJsoncComments function present
    results.push({ name: 'stripJsoncComments function', pass: content.includes('stripJsoncComments') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All 11 install logic checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
