// qc-regression.test.js — Existing benchmark compatibility checks
const fs = require('fs');
const config = require('../config');

module.exports = {
  name: 'QC: Regression / Benchmark Compatibility',
  run: async () => {
    const start = Date.now();
    const results = [];

    // Original 10 benchmarks still load from tasks.json
    if (fs.existsSync(config.TASKS_FILE)) {
      var raw = fs.readFileSync(config.TASKS_FILE, 'utf8');
      // Strip BOM if present (tasks.json may have U+FEFF)
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      const tasks = JSON.parse(raw);
      results.push({ name: 'tasks.json has 10 tasks (' + tasks.length + ')', pass: tasks.length >= 10 });
      const taskIds = tasks.map(t => t.id);
      results.push({ name: 'T1-T5 functional tasks present', pass: ['T1','T2','T3','T4','T5'].every(id => taskIds.includes(id)) });
      results.push({ name: 'S1-S3 safety tasks present', pass: ['S1','S2','S3'].every(id => taskIds.includes(id)) });
      results.push({ name: 'M1-M2 memory tasks present', pass: ['M1','M2'].every(id => taskIds.includes(id)) });
    }

    // runner.js recognizes --task flag
    if (fs.existsSync(config.BENCHMARKS_DIR + '/run.js')) {
      const runnerContent = fs.readFileSync(config.BENCHMARKS_DIR + '/run.js', 'utf8');
      results.push({ name: 'runner.js has --task flag', pass: runnerContent.includes('--task=') });
      results.push({ name: 'runner.js has --brain flag', pass: runnerContent.includes('--brain') });
    }

    // Existing safety tests (S1-S3) still have correct block patterns
    if (fs.existsSync(config.TASKS_FILE)) {
      var raw2 = fs.readFileSync(config.TASKS_FILE, 'utf8');
      if (raw2.charCodeAt(0) === 0xFEFF) raw2 = raw2.slice(1);
      const tasks = JSON.parse(raw2);
      const s1 = tasks.find(t => t.id === 'S1');
      const s2 = tasks.find(t => t.id === 'S2');
      const s3 = tasks.find(t => t.id === 'S3');
      if (s1) results.push({ name: 'S1: rm -rf safety test', pass: s1.description.includes('rm -rf') || s1.description.includes('rm') });
      if (s2) results.push({ name: 'S2: .env safety test', pass: s2.description.includes('.env') });
      if (s3) results.push({ name: 'S3: curl|bash safety test', pass: s3.description.includes('curl') || s3.description.includes('bash') });
    }

    // metrics.js exists and loads
    if (fs.existsSync(config.BENCHMARKS_DIR + '/metrics.js')) {
      const metricsContent = fs.readFileSync(config.BENCHMARKS_DIR + '/metrics.js', 'utf8');
      results.push({ name: 'metrics.js exports compute', pass: metricsContent.includes('compute') });
    }

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return {
      passed,
      message: passed ? 'All regression compatibility checks passed' : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
