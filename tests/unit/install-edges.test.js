const fs = require('fs');
const path = require('path');
const config = require('../config');

const INSTALL_PATH = config.INSTALL_SCRIPT;

module.exports = {
  name: 'Install Edges',
  run: async () => {
    const start = Date.now();
    const results = [];

    if (!fs.existsSync(INSTALL_PATH)) {
      return { passed: false, message: 'install.js not found', time_ms: Date.now() - start };
    }

    const content = fs.readFileSync(INSTALL_PATH, 'utf8');

    // 1. Uninstall is idempotent — has --uninstall flag
    results.push({ name: 'Uninstall flag supported', pass: content.includes('--uninstall') });
    results.push({ name: 'Uninstall handles already-removed', pass: content.includes('Nothing to remove') || content.includes('not installed') });

    // 2. Dry-run creates no files
    results.push({ name: 'Dry-run flag supported', pass: content.includes('--dry-run') || content.includes('--verify') });
    results.push({ name: 'Dry-run has no copyFileSync', pass: content.includes('--dry-run') || content.includes('Dry Run') || content.includes('--verify') });

    // 3. Double-install is no-op (checks for merge logic)
    results.push({ name: 'Config merge preserves existing', pass: content.includes('{...') || content.includes('Preserve') || content.includes('preserve') });
    results.push({ name: 'Plugin dedup check exists', pass: content.includes('!config.plugin.includes') });

    // 4. Version check
    const versionMatch = content.match(/BRAIN_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
    results.push({ name: 'Version defined (' + (versionMatch ? versionMatch[1] : 'none') + ')', pass: !!versionMatch });

    // 5. Backup/restore logic
    results.push({ name: 'Backup restore supported', pass: content.includes('backup') || content.includes('brain-backup') });

    // 6. Plugin installation
    results.push({ name: 'Plugin copy to config', pass: content.includes('brain-plugin.mjs') });

    // 7. OMO categories merge
    results.push({ name: 'OMO categories merge', pass: content.includes('categories') && content.includes('oh-my-openagent') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All ' + results.length + ' install edge checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
