#!/usr/bin/env node
// runner.js — Unified test runner for brain-agent test framework
// Usage: node tests/runner.js [--unit] [--integration] [--e2e] [--circuits] [--qc] [--all] [--dangerous]
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const CATEGORIES = [
  { flag: '--unit', dir: 'unit', label: 'UNIT' },
  { flag: '--integration', dir: 'integration', label: 'INTEGRATION' },
  { flag: '--e2e', dir: 'e2e', label: 'E2E' },
  { flag: '--circuits', dir: 'circuits', label: 'CIRCUITS' },
  { flag: '--qc', dir: 'qc', label: 'QC' },
];

function shouldRun(flag) {
  if (process.argv.includes('--all')) return true;
  return process.argv.includes(flag);
}

function loadTests(category) {
  const dir = path.join(ROOT, category.dir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.test.js'))
    .sort()
    .map(f => {
      const mod = require(path.join(dir, f));
      return { name: mod.name || f.replace('.test.js', ''), run: mod.run, file: f };
    });
}

function pad(s, len) { while (s.length < len) s += ' '; return s; }

async function runTests(category, tests) {
  const results = [];
  for (const test of tests) {
    const start = Date.now();
    try {
      const result = await test.run();
      const elapsed = Date.now() - start;
      const status = result.passed ? 'PASS' : 'FAIL';
      const display = '[' + category.label + '] ' + pad(test.name, 40) + '... ' + status + ' (' + elapsed + 'ms)';
      console.log(display);
      results.push({ name: test.name, passed: result.passed, message: result.message, time_ms: elapsed, status });
    } catch (e) {
      const elapsed = Date.now() - start;
      const display = '[' + category.label + '] ' + pad(test.name, 40) + '... FAIL (' + elapsed + 'ms)';
      console.log(display);
      results.push({ name: test.name, passed: false, message: e.message, time_ms: elapsed, status: 'FAIL' });
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node tests/runner.js [--unit] [--integration] [--e2e] [--circuits] [--qc] [--all] [--dangerous]');
    console.log('  --all         Run all test categories');
    console.log('  --dangerous   Include dangerous tests (real install/uninstall)');
    process.exit(0);
  }

  const allResults = [];

  for (const cat of CATEGORIES) {
    if (!shouldRun(cat.flag)) continue;
    const tests = loadTests(cat);
    if (tests.length === 0) {
      console.log('[' + cat.label + '] No tests found in ' + cat.dir + '/');
      continue;
    }
    console.log('\n=== ' + cat.label + ' (' + tests.length + ' tests) ===\n');
    const results = await runTests(cat, tests);
    allResults.push(...results);
  }

  const total = allResults.length;
  const pass = allResults.filter(r => r.passed).length;
  const fail = total - pass;

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:  PASS: ' + pass + ',  FAIL: ' + fail + ',  TOTAL: ' + total);
  console.log('='.repeat(50) + '\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Runner error:', e);
  process.exit(1);
});
